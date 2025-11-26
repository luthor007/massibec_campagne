// pages/api/commandes.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../lib/mongodb';
import Order from '../../models/Order';
import User from '../../models/User';
import School from '../../models/School';
import Store from '../../models/Store';
import Campaign from '../../models/Campaign';
import Product from '../../models/Product';
import StudentInventory from '../../models/StudentInventory';
import FunnelEvent from '../../models/FunnelEvent';
import { sendEmail, sendSaleNotificationEmail } from '../../utils/gmailMailer';
import getNextOrderId from '../../utils/getNextOrderId';
import { calculateDonationProfits, isTestCampaign } from '../../utils/campaignHelpers';
import { getToken } from 'next-auth/jwt'; // Add this import
import { IOrder } from '../../types/order'
import mongoose from 'mongoose';
import crypto from 'crypto';

interface ProductItem {
  product: string;
  quantity: number;
  name: string;
  price: number;
  cost: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    await dbConnect();

    //const newOrderId = (await getNextOrderId()).toString();

    const {
      products,
      totalAmount,
      customerEmail,
      customerName,
      storeId,
      school,
      campaignId, // Campaign-based: campaignId from checkout
      owner,
      phoneNumber,
      tip, // Legacy field
      studentDonation,
      schoolDonation,
      autoDeposit,
      deliveryOption,
      customDeliveryOption,
      customerDeliveryAddress,
    } = req.body;

    // Ensure tip and donations are numbers (default to 0 if undefined)
    const tipValue = tip ? Number(tip) : 0;
    const studentDonationValue = studentDonation ? Number(studentDonation) : 0;
    const schoolDonationValue = schoolDonation ? Number(schoolDonation) : 0;

    // Find the user by ID or email (or any unique identifier available)
    const user = await User.findById(owner._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Increment the order counter by 1
    user.orderCounter = user.orderCounter + 1;
    const newOrderId = user.orderCounter;

    // Save the updated user
    await user.save();


    // Validation des champs requis (school can be optional if we can get it from campaign)
    console.log(newOrderId)
    console.log(products)
    console.log(totalAmount)
    console.log(customerEmail)
    console.log(customerName)
    console.log(storeId)
    console.log(school)
    // Note: We use school address for delivery, not personal address
    // Personal addresses are only needed for student records
    if (
      !newOrderId ||
      !products ||
      !Array.isArray(products) ||
      products.length === 0 ||
      !totalAmount ||
      !customerEmail ||
      !customerName ||
      !storeId ||
      !owner ||
      !phoneNumber
    ) {
      return res.status(400).json({ message: 'Certains champs requis sont manquants.' });
    }

    try {
      // First, convert storeId from slug to ObjectId if necessary and get store data
      // This needs to happen early to get campaignId and schoolId
      let storeData: any = null;
      let finalCampaignId: string | null = campaignId ? campaignId.toString() : null;
      const isStoreIdObjectId = /^[0-9a-fA-F]{24}$/.test(storeId);

      if (!isStoreIdObjectId) {
        // Try to find store by slug
        storeData = await Store.findOne({ slug: storeId });
        if (storeData) {
          // If campaignId is not provided, get it from the store
          if (!finalCampaignId && storeData.campaignId) {
            finalCampaignId = storeData.campaignId.toString();
            console.log('Using campaignId from store (found by slug):', finalCampaignId);
          }
        } else {
          // If still not found and it's a valid ObjectId format, try it
          if (mongoose.Types.ObjectId.isValid(storeId)) {
            storeData = await Store.findById(storeId);
          } else {
            return res.status(400).json({ message: 'Store non trouvée.' });
          }
        }
      } else {
        // StoreId is already an ObjectId
        storeData = await Store.findById(storeId);
        if (storeData && !finalCampaignId && storeData.campaignId) {
          finalCampaignId = storeData.campaignId.toString();
          console.log('Using campaignId from store (found by ID):', finalCampaignId);
        }
      }

      if (!storeData) {
        return res.status(400).json({ message: 'Store non trouvée.' });
      }

      // Now use the store's ObjectId for the order
      const finalStoreId = storeData._id.toString();

      // Ensure owner matches store owner (owner is already fetched at line 53)
      // If owner doesn't match storeData.user, fetch the correct one
      let finalOwner = owner;
      if (!finalOwner || finalOwner._id.toString() !== storeData.user.toString()) {
        const ownerFromStore = await User.findById(storeData.user);
        if (!ownerFromStore) {
          return res.status(404).json({ message: "User not found" });
        }
        finalOwner = ownerFromStore;
      }

      // Now try to get schoolId - first from request, then from campaign, then from owner
      let schoolId = typeof school === 'string' ? school : (school?._id || school);

      // If schoolId is not provided, try to get it from the campaign
      if (!schoolId && finalCampaignId) {
        const campaign = await Campaign.findById(finalCampaignId).populate('school');
        if (campaign?.school) {
          schoolId = campaign.school._id?.toString() || campaign.school.toString();
          console.log('Using schoolId from campaign:', schoolId);
        }
      }

      // If still no schoolId, try to get it from store's campaign
      if (!schoolId && storeData.campaignId) {
        const storeCampaign = await Campaign.findById(storeData.campaignId).populate('school');
        if (storeCampaign?.school) {
          schoolId = storeCampaign.school._id?.toString() || storeCampaign.school.toString();
          console.log('Using schoolId from store campaign:', schoolId);
        }
      }

      // Final fallback: use finalOwner.school if available
      if (!schoolId && finalOwner.school) {
        schoolId = typeof finalOwner.school === 'string' ? finalOwner.school : finalOwner.school.toString();
        console.log('Using schoolId from owner:', schoolId);
      }

      // Now validate schoolId
      if (!schoolId) {
        console.error('School ID is missing from request. Owner:', finalOwner);
        return res.status(400).json({
          message: 'École non trouvée. Veuillez vous assurer que vous êtes bien associé à une campagne active.'
        });
      }

      const schoolData = await School.findById(schoolId);
      if (!schoolData) {
        console.error('School not found in database. School ID:', schoolId);
        return res.status(400).json({
          message: 'École non trouvée. Veuillez contacter le support si le problème persiste.'
        });
      }

      // Campaign-based approach: Use campaignId we already have
      let campaignNumber = 1;
      let activeCampaign: any = null;

      console.log('Order creation - campaignId from request:', campaignId);
      console.log('Order creation - finalCampaignId:', finalCampaignId);

      // Load campaign data if we have a campaignId and get schoolId from campaign if needed
      if (finalCampaignId) {
        activeCampaign = await Campaign.findById(finalCampaignId).populate('school');
        if (activeCampaign) {
          campaignNumber = activeCampaign.campaignNumber || 1;
          console.log('Found campaign in Campaign collection, campaignNumber:', campaignNumber);

          // If schoolId is not provided, get it from the campaign
          if (!schoolId && activeCampaign.school) {
            schoolId = activeCampaign.school._id?.toString() || activeCampaign.school.toString();
            console.log('Using schoolId from campaign:', schoolId);
          }
        } else {
          // Campaign not found in Campaign collection - check if it's in school's embedded campaigns
          console.log('Campaign not found in Campaign collection, checking school embedded campaigns');
          const schoolCampaign = schoolData.campaigns?.find((camp: any) =>
            camp._id?.toString() === finalCampaignId ||
            camp._id?._id?.toString() === finalCampaignId
          );
          if (schoolCampaign) {
            // Use embedded campaign - ensure it has status field
            activeCampaign = {
              ...schoolCampaign,
              status: schoolCampaign.status || 'pending_approval' // Default to pending if status missing
            };
            campaignNumber = schoolCampaign.campaignNumber || 1;
            console.log('Found campaign in school embedded campaigns, campaignNumber:', campaignNumber);
          } else {
            console.error('Campaign not found for campaignId:', finalCampaignId);
            console.log('Available school campaigns:', schoolData.campaigns?.map((c: any) => c._id));
            // Keep finalCampaignId even if not found - order should still be associated with it
            // This ensures orders can be filtered properly later
          }
        }
      }

      // Fallback: If no campaignId from store or request, try to get from user's active campaign
      if (!finalCampaignId && finalOwner._id) {
        const userData = await User.findById(finalOwner._id);
        if (userData && userData.activeCampaignId) {
          finalCampaignId = userData.activeCampaignId.toString();
          // Find the campaign in user's campaigns array to get campaignNumber
          const userCampaign = userData.campaigns?.find((c: any) => {
            const cId = c.campaignId?.toString() || c.campaignId;
            return cId === finalCampaignId;
          });
          campaignNumber = userCampaign?.campaignNumber || 1;

          // Fetch the campaign data directly
          if (finalCampaignId) {
            activeCampaign = await Campaign.findById(finalCampaignId).populate('school');
            if (activeCampaign && !schoolId && activeCampaign.school) {
              schoolId = activeCampaign.school._id?.toString() || activeCampaign.school.toString();
              console.log('Using schoolId from user campaign:', schoolId);
            }
          }
        }
      }

      // Final fallback: school's active campaign if user doesn't have one
      if (!finalCampaignId) {
        const schoolActiveCampaign = schoolData.campaigns?.find((campaign: any) => campaign.isActive);
        campaignNumber = schoolActiveCampaign?.campaignNumber || schoolData.currentCampaignNumber || 1;
        finalCampaignId = schoolActiveCampaign?._id?.toString() || null;

        // Fetch campaign from Campaign collection if we have an ID
        if (finalCampaignId) {
          activeCampaign = await Campaign.findById(finalCampaignId).populate('school');
          if (activeCampaign && !schoolId && activeCampaign.school) {
            schoolId = activeCampaign.school._id?.toString() || activeCampaign.school.toString();
            console.log('Using schoolId from school active campaign:', schoolId);
          }
        }
      }

      // If we still don't have schoolId, try to get it from the store's campaign
      if (!schoolId && storeData.campaignId) {
        const storeCampaign = await Campaign.findById(storeData.campaignId).populate('school');
        if (storeCampaign?.school) {
          schoolId = storeCampaign.school._id?.toString() || storeCampaign.school.toString();
          console.log('Using schoolId from store campaign:', schoolId);
        }
      }

      // Final fallback: use finalOwner.school if available
      if (!schoolId && finalOwner.school) {
        schoolId = typeof finalOwner.school === 'string' ? finalOwner.school : finalOwner.school.toString();
        console.log('Using schoolId from owner:', schoolId);
      }

      // Récupérer les informations du vendeur (propriétaire de l'école)

      // Générer les données pour l'e-mail
      console.log(`Here is customer email: ${customerEmail}`)
      const parentFullName = finalOwner.name; // Le nom du parent/vendeur

      // Confirmation de commande au client
      // À: Client, CC: vendeur
      // De: (Nom du parent - Campagne (nom école)) <campagne@jappuie.ca>
      // Objet: (Commande #X)(Montant), pour (Nom du client), de (Nom du Parent) - Campagne (Nom école)
      // Use campaign data we already fetched
      const campaignData = activeCampaign;

      // Calculate donation breakdown
      let tipBreakdown = { studentCash: 0, studentSchoolAccount: 0, schoolProject: 0 };
      let studentDonationSplit = { studentAccount: 0, studentCash: 0 };

      // Legacy: Calculate old tip breakdown if tip is provided
      if (tip && tip > 0 && campaignData) {
        tipBreakdown = calculateDonationProfits(tip, campaignData);
      }

      // New: Calculate student donation split
      const studentDonationAmount = studentDonation || 0;
      if (studentDonationAmount > 0 && campaignData?.donationsForStudents?.splitConfig) {
        const splitConfig = campaignData.donationsForStudents.splitConfig;
        studentDonationSplit = {
          studentAccount: Math.round((studentDonationAmount * splitConfig.studentAccount / 100) * 100) / 100,
          studentCash: Math.round((studentDonationAmount * splitConfig.studentCash / 100) * 100) / 100
        };
      }

      // Check if campaign is in test mode
      const isTest = activeCampaign ? isTestCampaign(activeCampaign) : false;

      // Get owner contact info based on role
      // For delivery location, always use school address (makes more sense than personal address)
      // For phone, use owner's phone if available, otherwise school phone
      const deliveryAddress = schoolData.address || '';
      const deliveryCity = schoolData.ville || finalOwner.schoolManagerInfo?.ville || '';
      const ownerPhone = finalOwner.parentInfo?.telephone || finalOwner.schoolManagerInfo?.telephone || finalOwner.schoolManagerInfo?.cellulaire || schoolData.telephone || '';

      // Validate and update product prices from catalog (with campaign custom prices)
      // This ensures orders always use current prices, even if cart had stale prices
      let validatedProducts = products;
      let priceUpdated = false;

      if (products && products.length > 0) {
        // Fetch all products from database
        const productIds = products.map((p: any) => p.product).filter(Boolean);
        const productDocs = await Product.find({ _id: { $in: productIds } }).lean();

        // Get campaign with custom prices if available
        let campaignWithPrices: any = null;
        if (finalCampaignId) {
          campaignWithPrices = await Campaign.findById(finalCampaignId)
            .populate('customPrices.productId', '_id')
            .lean();
        }

        // Validate and update prices
        validatedProducts = products.map((item: any) => {
          const productDoc: any = productDocs.find((p: any) => {
            const pId = p._id?.toString() || p._id;
            const itemId = item.product?.toString() || item.product;
            return pId === itemId;
          });

          if (!productDoc) {
            console.warn(`[Order API] Product ${item.product} not found in database, using provided price`);
            return item;
          }

          // Get base price from product
          let correctPrice = productDoc.price || item.price;
          let correctCost = productDoc.cost || item.cost;

          // Check for custom price in campaign
          if (campaignWithPrices?.customPrices && Array.isArray(campaignWithPrices.customPrices) && campaignWithPrices.customPrices.length > 0) {
            const productIdStr = productDoc._id?.toString() || String(productDoc._id);
            const customPrice = campaignWithPrices.customPrices.find((cp: any) => {
              const cpProductId = cp.productId?._id?.toString() || cp.productId?.toString() || String(cp.productId);
              return cpProductId === productIdStr;
            });

            if (customPrice && customPrice.price !== undefined && customPrice.price !== null) {
              correctPrice = customPrice.price;
              console.log(`[Order API] Using custom price for ${item.name}: ${item.price} -> ${correctPrice}`);
            }
          }

          // Check if price needs updating
          if (Math.abs(item.price - correctPrice) > 0.01) {
            console.warn(`[Order API] Price mismatch for ${item.name}: cart had ${item.price}, catalog has ${correctPrice}. Updating to catalog price.`);
            priceUpdated = true;
          }

          return {
            ...item,
            price: correctPrice,
            cost: correctCost
          };
        });
      }

      // Recalculate subtotal if prices were updated
      const validatedSubtotal = validatedProducts.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

      // Calculate original subtotal before discount
      const originalSubtotal = validatedSubtotal;

      // If prices were updated, recalculate totalAmount (products only, donations stay the same)
      let finalTotalAmount = totalAmount;
      if (priceUpdated) {
        // Recalculate total with correct prices
        // Apply discount if store has discounts enabled
        const discountRate = storeData.discountEnabled !== false && validatedSubtotal >= 6 ? 0.05 : 0;
        finalTotalAmount = validatedSubtotal * (1 - discountRate);
        console.log(`[Order API] Prices updated, recalculated total: ${totalAmount} -> ${finalTotalAmount}`);
      }

      // Calculate discount amount if store has discounts enabled
      const discountAmount = storeData.discountEnabled !== false
        ? Math.max(0, originalSubtotal - finalTotalAmount)
        : 0;

      // Check if we're in limited inventory mode (user has inventory records for this campaign)
      let orderStatus = 'En attente'; // Default status
      if (finalCampaignId && finalOwner._id) {
        try {
          const StudentInventory = (await import('../../models/StudentInventory')).default;
          const mongoose = (await import('mongoose')).default;

          // Convert campaignId to ObjectId if needed
          let campaignIdObjectId: mongoose.Types.ObjectId | string = finalCampaignId;
          if (mongoose.Types.ObjectId.isValid(finalCampaignId)) {
            campaignIdObjectId = new mongoose.Types.ObjectId(finalCampaignId);
          }

          const inventoryCount = await StudentInventory.countDocuments({
            userId: finalOwner._id,
            campaignId: campaignIdObjectId
          });

          // If user has inventory records, we're in limited inventory mode
          // Orders should be created with status 'Commandé' (already ordered)
          if (inventoryCount > 0) {
            orderStatus = 'Commandé';
            console.log(`[Order Creation] Limited inventory mode detected (${inventoryCount} inventory records). Setting status to 'Commandé'`);
          }
        } catch (err) {
          console.warn('[Order Creation] Error checking inventory mode:', err.message);
          // Continue with default status if check fails
        }
      }

      // Créer une nouvelle commande
      console.log('Creating order with campaignId:', finalCampaignId, 'campaignNumber:', campaignNumber, 'isTest:', isTest, 'status:', orderStatus);
      const newCommande = new Order({
        user: finalOwner._id,
        products: validatedProducts.map((item: any) => ({
          product: item.product,
          quantity: item.quantity,
          productName: item.name,
          productPrice: item.price,
          productCost: item.cost
        })),
        totalAmount: finalTotalAmount,
        discount: discountAmount, // Store discount amount for profit calculations
        customerEmail: customerEmail,
        customerName: customerName,
        store: finalStoreId, // Use ObjectId, not slug
        orderId: newOrderId,
        school: schoolData._id,
        campaignId: finalCampaignId, // Always set campaignId if available, even if campaign not found in DB
        campaignNumber,
        phoneNumber: phoneNumber,
        status: orderStatus, // Set status based on inventory mode
        // New donation fields
        studentDonation: studentDonation || 0,
        schoolDonation: schoolDonation || 0,
        studentDonationSplit: studentDonationSplit,
        // Legacy fields for backward compatibility
        tip: tip || studentDonation,
        tipBreakdown: tipBreakdown,
        isTest: isTest, // Mark order as test if campaign is in test mode
        deliveryOption: deliveryOption || '',
        customDeliveryOption: customDeliveryOption || '',
        customerDeliveryAddress: customerDeliveryAddress || '',
        //orderDate: new Date(),
        //orderDeadline: schoolData.finCampagne,
        //deliveryDate: schoolData.dateDeLivraison,
        //deliveryLocation: finalOwner.parentInfo.address,
      });

      await newCommande.save();
      console.log('Order created successfully with _id:', newCommande._id, 'campaignId:', newCommande.campaignId);

      // Check if this is the first order for the user
      const existingOrders = await Order.find({ user: finalOwner._id, isTest: { $ne: true } });
      const isFirstOrder = existingOrders.length === 1;

      // Track first order
      if (isFirstOrder) {
        const userType = finalOwner.role === 'student' ? 'student' : 'school';
        const sessionId = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

        const funnelEvent = new FunnelEvent({
          eventType: 'first_order_placed',
          userType,
          userId: finalOwner._id.toString(),
          sessionId,
          metadata: {
            orderId: newCommande.orderId?.toString() || newCommande._id.toString(),
            storeId: finalStoreId.toString(),
            totalAmount: finalTotalAmount
          }
        });

        await funnelEvent.save().catch(err => console.error('Error tracking first order:', err));
      }

      // Decrement inventory for each product
      try {
        const userId = finalOwner._id.toString();
        const campaignIdForInventory = finalCampaignId;

        if (userId && campaignIdForInventory) {
          for (const item of products) {
            const productName = item.name;
            const quantity = item.quantity;

            // Increment sold quantity in inventory
            const inventory = await StudentInventory.findOne({
              userId,
              campaignId: campaignIdForInventory,
              productName
            });

            if (inventory) {
              inventory.soldQuantity += quantity;
              inventory.availableQuantity = Math.max(0, inventory.orderedQuantity - inventory.soldQuantity);
              await inventory.save();
            } else {
              // If inventory doesn't exist, this shouldn't happen, but handle gracefully
              console.warn(`Inventory not found for userId: ${userId}, campaignId: ${campaignIdForInventory}, productName: ${productName}`);
            }
          }
        } else {
          console.warn('Could not decrement inventory: userId or campaignId missing', { userId, campaignId: campaignIdForInventory });
        }
      } catch (inventoryError) {
        // Log error but don't fail the order creation
        console.error('Error decrementing inventory:', inventoryError);
      }

      // Calculate profit splits and benefits using campaign data
      const totalUnits = products.reduce((sum: number, item: any) => sum + item.quantity, 0);
      let totalStudentCashBenefit = 0;
      let totalStudentSchoolAccountBenefit = 0;
      let totalSchoolProjectBenefit = 0;
      let totalRaffleBenefit = 0;
      let studentPercentage = 0;

      if (campaignData && campaignData.profitSplits && campaignData.customPrices) {
        // Use campaign-specific profit splits
        products.forEach((item: any) => {
          const customPrice = campaignData.customPrices.find((cp: any) =>
            cp.productId.toString() === item.product.toString()
          );
          const profitSplit = campaignData.profitSplits.find((ps: any) =>
            ps.productId.toString() === item.product.toString()
          );

          if (customPrice && profitSplit) {
            // Use new fields if available, otherwise fallback to old fields
            const studentCash = Number(profitSplit.studentCash) || Number(profitSplit.student) || 0;
            const studentSchoolAccount = Number(profitSplit.studentSchoolAccount) || 0;
            const schoolProject = Number(profitSplit.schoolProject) || Number(profitSplit.school) || 0;
            const raffle = Number(profitSplit.raffle) || 0;

            totalStudentCashBenefit += studentCash * item.quantity;
            totalStudentSchoolAccountBenefit += studentSchoolAccount * item.quantity;
            totalSchoolProjectBenefit += schoolProject * item.quantity;
            totalRaffleBenefit += raffle * item.quantity;
          }
        });

        // Calculate percentage for legacy compatibility
        const totalStudentBenefit = totalStudentCashBenefit + totalStudentSchoolAccountBenefit;
        const totalBenefits = totalStudentBenefit + totalSchoolProjectBenefit + totalRaffleBenefit;
        studentPercentage = totalBenefits > 0 ? (totalStudentBenefit / totalBenefits) * 100 : 0;
      } else {
        // Fallback to old school-based calculation
        const totalProfit = products.reduce((sum: number, item: any) => sum + ((item.price - item.cost) * item.quantity), 0);
        const schoolStudentPercentage = schoolData.split?.studentBenefit || 85.6;
        const schoolOrganizationPercentage = schoolData.split?.organizationBenefit || 9.4;
        const schoolRafflePercentage = schoolData.split?.raffleBenefit || 5.0;

        // Assume all student benefit goes to cash for percentage fallback
        totalStudentCashBenefit = (totalProfit * schoolStudentPercentage / 100);
        totalStudentSchoolAccountBenefit = 0;
        totalSchoolProjectBenefit = (totalProfit * schoolOrganizationPercentage / 100);
        totalRaffleBenefit = (totalProfit * schoolRafflePercentage / 100);
        studentPercentage = schoolStudentPercentage;
      }

      // Deduct discount from student benefits: first from studentSchoolAccountBenefit, then from studentCashBenefit
      if (discountAmount > 0) {
        // First, try to deduct from student school account benefit
        if (totalStudentSchoolAccountBenefit >= discountAmount) {
          // Discount can be fully covered by school account benefit
          totalStudentSchoolAccountBenefit -= discountAmount;
        } else {
          // Need to deduct from both school account and cash
          const remainingDiscount = discountAmount - totalStudentSchoolAccountBenefit;
          totalStudentSchoolAccountBenefit = 0;
          totalStudentCashBenefit = Math.max(0, totalStudentCashBenefit - remainingDiscount);
        }
      }

      // Calculate total donations for email
      const totalDonations = studentDonationValue + schoolDonationValue + tipValue;

      const emailParams = {
        to: customerEmail,
        cc: finalOwner.email,
        from: `${parentFullName} - Campagne ${schoolData.name} <campagne@jappuie.ca>`,
        subject: `(Commande #${newOrderId})($${(totalAmount + totalDonations).toFixed(2)}), pour (${customerName}), de (${parentFullName}) - Campagne (${schoolData.name})`,
        firstName: customerName,
        customerEmail: customerEmail,
        hoursAvailable: storeData.hoursAvailable,
        storeName: schoolData.name,
        products: products.map((item: any) => ({
          productId: item.product,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          amount: (item.price * item.quantity).toFixed(2),
        })),
        totalAmount: totalAmount,
        discount: discountAmount, // Add discount to email params
        originalSubtotal: originalSubtotal, // Add original subtotal
        tip: tipValue, // Legacy field
        studentDonation: studentDonationValue,
        schoolDonation: schoolDonationValue,
        studentDonationSplit: studentDonationSplit,
        autoDeposit: autoDeposit,
        orderId: newOrderId,
        orderDate: new Date().toLocaleDateString('fr-FR'),
        orderDeadline: activeCampaign?.endDate ? new Date(activeCampaign.endDate).toLocaleDateString('fr-FR') : '',
        deliveryDate: activeCampaign?.deliveryDate ? new Date(activeCampaign.deliveryDate).toLocaleDateString('fr-FR') : '',
        deliveryLocation: deliveryAddress,
        deliveryCity: deliveryCity,
        sellerName: finalOwner.name,
        sellerPhone: ownerPhone,
        sellerEmail: finalOwner.email,
        // Campaign-specific data
        campaignId: campaignId || undefined,
        campaignNumber: campaignNumber,
        profitSplits: campaignData?.profitSplits || [],
        customPrices: campaignData?.customPrices || [],
        // New profit fields
        studentCashBenefit: totalStudentCashBenefit + (tipBreakdown?.studentCash || 0),
        studentSchoolAccountBenefit: totalStudentSchoolAccountBenefit + (tipBreakdown?.studentSchoolAccount || 0),
        schoolProjectBenefit: totalSchoolProjectBenefit + (tipBreakdown?.schoolProject || 0),
        raffleBenefit: totalRaffleBenefit,
        totalUnits: totalUnits,
        // Legacy fields for backward compatibility
        studentPercentage: studentPercentage,
        studentBenefit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit + (tipBreakdown?.studentCash || 0) + (tipBreakdown?.studentSchoolAccount || 0),
        organizationBenefit: totalSchoolProjectBenefit + (tipBreakdown?.schoolProject || 0),
        totalStudentBenefit: totalStudentCashBenefit + totalStudentSchoolAccountBenefit + (tipBreakdown?.studentCash || 0) + (tipBreakdown?.studentSchoolAccount || 0),
        totalOrganizationBenefit: totalSchoolProjectBenefit + (tipBreakdown?.schoolProject || 0),
        totalRaffleBenefit: totalRaffleBenefit,
        email: finalOwner.email,
        organizationType: schoolData.organizationType || 'school', // Pass organization type for dynamic terminology
        deliveryOption: deliveryOption || '',
        customDeliveryOption: customDeliveryOption || '',
        customerDeliveryAddress: customerDeliveryAddress || '',
      };

      // Envoyer l'e-mail de confirmation au client (avec vendeur en CC)
      // Wrap in try-catch to not block order creation if email fails
      try {
        await sendEmail(emailParams);
      } catch (emailError: any) {
        // Log detailed error information
        console.error('Erreur lors de l\'envoi de l\'e-mail de confirmation:', emailError);
        if (emailError.response?.body?.errors) {
          console.error('Détails de l\'erreur SendGrid:', JSON.stringify(emailError.response.body.errors, null, 2));
        }
        // Don't throw - order creation should succeed even if email fails
      }

      // Confirmation d'une commande au vendeur (copie interne supprimée)
      // Ne pas envoyer l'email "Félicitations!" si le client est l'étudiant lui-même
      // L'étudiant recevra seulement la confirmation de commande en CC
      //if (customerEmail.toLowerCase() !== owner.email.toLowerCase()) {
      if (false) {
        // À: vendeur
        // De: Jappuie <campagne@jappuie.ca>
        // Objet: (Commande #X) -(Montant)- de: (Nom du parent) - nom école
        // Texte: La distribution se fera à (Adresse de l'école) le (date de livraison)
        const emailParams2 = {
          to: finalOwner.email,
          subject: `(Commande #${newOrderId}) -($${(totalAmount + tipValue).toFixed(2)})- de: (${parentFullName}) - ${schoolData.name}`,
          studentName: finalOwner.name,
          firstName: customerName,
          customerEmail: customerEmail,
          customerPhone: phoneNumber,
          schoolName: schoolData.name,
          schoolAddress: deliveryAddress,
          deliveryDate: activeCampaign?.deliveryDate ? new Date(activeCampaign.deliveryDate).toLocaleDateString('fr-FR') : '',
          products: products.map((item: any) => ({
            productId: item.product,
            productName: item.name,
            quantity: item.quantity,
            price: item.price,
            amount: (item.price * item.quantity).toFixed(2),
          })),
          totalAmount: totalAmount + tipValue,
          tip: tipValue,
          autoDeposit: autoDeposit,
          orderId: newOrderId,
          orderDate: new Date().toLocaleDateString('fr-FR'),

        };

        // Envoyer l'e-mail de confirmation (vendeur avec facturation en CC)
        try {
          await sendSaleNotificationEmail(emailParams2);
        } catch (emailError: any) {
          console.error('Erreur lors de l\'envoi de l\'e-mail de notification de vente:', emailError);
          if (emailError.response?.body?.errors) {
            console.error('Détails de l\'erreur SendGrid:', JSON.stringify(emailError.response.body.errors, null, 2));
          }
          // Don't throw - order creation should succeed even if email fails
        }
      } else {
        console.log(`Skipping sale notification email - student ${finalOwner.email} is ordering for themselves. They will receive the order confirmation in CC only.`);
      }

      res.status(201).json({
        message: 'Commande créée avec succès.',
        orderId: newOrderId,
        order: {
          _id: newCommande._id,
          orderId: newOrderId
        }
      });
    } catch (error: any) {
      console.error('Erreur lors de la création de la commande:', error);
      res.status(500).json({ message: 'Erreur serveur.' });
    }
  } else if (req.method === 'GET') {
    // Vérifier le token d'authentification
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return res.status(401).json({ message: 'Non autorisé, pas connecté' });
    }

    const userId = token.sub as string; // Extraire l'ID utilisateur depuis le token
    try {
      await dbConnect();

      // With the new "one store per campaign" system, we need to find all stores belonging to this user
      // Then filter orders by those stores
      const userStores = await Store.find({ user: userId });
      const storeIds = userStores.map(store => store._id);

      const orConditions: any[] = [
        { user: userId }, // Orders where user is the owner
      ];

      // Add stores filter if user has stores
      if (storeIds.length > 0) {
        orConditions.push({ store: { $in: storeIds } }); // Orders for any of user's stores
      }

      if (mongoose.Types.ObjectId.isValid(userId)) {
        orConditions.push({ user: new mongoose.Types.ObjectId(userId) });
        if (storeIds.length > 0) {
          orConditions.push({ store: { $in: storeIds.map(id => new mongoose.Types.ObjectId(id.toString())) } });
        }
      }

      console.log('Fetching orders for user:', userId);
      console.log('User has', storeIds.length, 'stores');
      console.log('OR conditions:', JSON.stringify(orConditions));

      // Check if campaignId is provided in query params
      const campaignId = req.query.campaignId as string;

      // Build query conditions
      const queryConditions: any = { $or: orConditions };

      // Add campaign filter if campaignId is provided
      // ONLY show orders from the active campaign (exclude legacy orders)
      if (campaignId && mongoose.Types.ObjectId.isValid(campaignId)) {
        queryConditions.$and = [
          { $or: orConditions },
          { campaignId: new mongoose.Types.ObjectId(campaignId) }
        ];
        delete queryConditions.$or; // Remove the simple $or since we're using $and now
        console.log('Filtering by campaignId:', campaignId, 'ONLY showing orders from this campaign');
      }

      // Use Mongoose model directly and populate store information
      const orders = await Order.find(queryConditions)
        .populate('store', 'discountEnabled')
        .sort({ createdAt: -1 })
        .lean();

      console.log('Found orders:', orders.length);

      return res.status(200).json(orders);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des commandes:', error);
      return res.status(400).json({ message: `Erreur lors de la récupération des commandes: ${error.message}` });
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}
