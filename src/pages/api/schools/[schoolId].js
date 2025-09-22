// pages/api/schools/[schoolId].js

import dbConnect from '../../../lib/mongodb';
import School from '../../../models/School';
import validator from 'validator';
import sanitizeHtml from 'sanitize-html';

export default async function handler(req, res) {
  await dbConnect();

  const { schoolId } = req.query;

  // Validate the MongoDB ObjectId
  if (!validator.isMongoId(schoolId)) {
    return res.status(400).json({ message: 'Invalid school ID.' });
  }

  try {
    const school = await School.findById(schoolId);
    if (!school) {
      return res.status(404).json({ message: 'School not found.' });
    }

    switch (req.method) {
      case 'GET':
        res.status(200).json(school);
        break;

      case 'PUT':
        const { name, address, split, customFields, ...otherFields } = req.body;

        // Validate required fields
        if (!name || !address || !split) {
          return res.status(400).json({ message: 'Tous les champs sont requis.' });
        }

        // Prepare update object
        const updateData = {
          name,
          address,
          split,
          customFields: customFields || {},
          ...otherFields
        };

        // Update the school
        const updatedSchool = await School.findByIdAndUpdate(
          schoolId,
          updateData,
          { 
            new: true,
            runValidators: true,
            upsert: false
          }
        );

        if (!updatedSchool) {
          return res.status(404).json({ message: 'École non trouvée.' });
        }

        res.status(200).json(updatedSchool);
        break;

      case 'PATCH':
        const updates = req.body;
        const allowedUpdates = ['expNum', 'accumba'];
        
        // Validate and sanitize updates
        Object.keys(updates).forEach(key => {
          if (allowedUpdates.includes(key) && updates[key]) {
            school[key] = sanitizeHtml(updates[key].toString().trim());
          }
        });

        // Save the updated school
        await school.save();

        res.status(200).json({
          id: school._id.toString(),
          name: school.name,
          expNum: school.expNum,
          accumba: school.accumba
        });
        break;

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH']);
        res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Error handling school:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error.',
        errors: error.errors 
      });
    }
    
    res.status(500).json({ message: 'Internal server error.' });
  }
}