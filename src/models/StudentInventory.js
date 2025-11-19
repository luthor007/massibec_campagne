// models/StudentInventory.js

import mongoose from 'mongoose';
import User from './User.js';
import Campaign from './Campaign.js';

const StudentInventorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    orderedQuantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    soldQuantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    availableQuantity: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Compound index to ensure one inventory record per student per campaign per product
StudentInventorySchema.index({ userId: 1, campaignId: 1, productName: 1 }, { unique: true });

// Pre-save hook to automatically calculate availableQuantity
StudentInventorySchema.pre('save', function (next) {
    this.availableQuantity = Math.max(0, this.orderedQuantity - this.soldQuantity);
    this.updatedAt = new Date();
    next();
});

// Static method to update or create inventory
StudentInventorySchema.statics.updateInventory = async function (userId, campaignId, productName, orderedQuantity, soldQuantity = null) {
    const inventory = await this.findOne({ userId, campaignId, productName });

    if (inventory) {
        // Update existing inventory
        if (orderedQuantity !== null && orderedQuantity !== undefined) {
            inventory.orderedQuantity = orderedQuantity;
        }
        if (soldQuantity !== null && soldQuantity !== undefined) {
            inventory.soldQuantity = soldQuantity;
        }
        inventory.availableQuantity = Math.max(0, inventory.orderedQuantity - inventory.soldQuantity);
        await inventory.save();
        return inventory;
    } else {
        // Create new inventory
        const newInventory = new this({
            userId,
            campaignId,
            productName,
            orderedQuantity: orderedQuantity || 0,
            soldQuantity: soldQuantity || 0,
            availableQuantity: Math.max(0, (orderedQuantity || 0) - (soldQuantity || 0))
        });
        await newInventory.save();
        return newInventory;
    }
};

// Static method to increment sold quantity
StudentInventorySchema.statics.incrementSold = async function (userId, campaignId, productName, quantity) {
    const inventory = await this.findOne({ userId, campaignId, productName });

    if (inventory) {
        inventory.soldQuantity += quantity;
        inventory.availableQuantity = Math.max(0, inventory.orderedQuantity - inventory.soldQuantity);
        await inventory.save();
        return inventory;
    }

    // If inventory doesn't exist, this shouldn't happen, but handle gracefully
    console.warn(`Inventory not found for userId: ${userId}, campaignId: ${campaignId}, productName: ${productName}`);
    return null;
};

// Static method to get inventory for a user and campaign
StudentInventorySchema.statics.getInventory = async function (userId, campaignId) {
    return await this.find({ userId, campaignId }).lean();
};

// Static method to get inventory map (productName -> availableQuantity)
StudentInventorySchema.statics.getInventoryMap = async function (userId, campaignId) {
    const inventory = await this.find({ userId, campaignId }).lean();
    const map = {};
    inventory.forEach(item => {
        map[item.productName] = {
            available: item.availableQuantity,
            ordered: item.orderedQuantity,
            sold: item.soldQuantity
        };
    });
    return map;
};

const StudentInventoryModel = mongoose.models.StudentInventory || mongoose.model('StudentInventory', StudentInventorySchema);

export default StudentInventoryModel;


