import dbConnect from '@/lib/mongodb';
import School from '@/models/School';
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = await getToken({ req });
    if (!token) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    // Check if user is Massibec (fournisseur)
    if (token.role !== 'fournisseur') {
      return res.status(403).json({ message: 'Accès non autorisé' });
    }

    await dbConnect();

    // Get all schools
    const schools = await School.find({});
    console.log(`Found ${schools.length} schools to process`);
    
    // Debug: Log Test Massibec specifically
    const testMassibec = schools.find(s => s.name === 'Test Massibec');
    if (testMassibec) {
      console.log('Test Massibec before fix:', {
        name: testMassibec.name,
        status: testMassibec.status,
        isActive: testMassibec.isActive,
        approved: testMassibec.approved
      });
    }

    let updatedCount = 0;
    const results = [];

    for (const school of schools) {
      let needsUpdate = false;
      const updates = {};
      const schoolResult = { name: school.name, changes: [] };

      // Fix isActive based on status
      if (school.status === 'approved' && (school.isActive !== true || school.isActive === undefined)) {
        updates.isActive = true;
        needsUpdate = true;
        schoolResult.changes.push(`Set isActive = true (status: approved, was: ${school.isActive})`);
      } else if ((school.status === 'rejected' || school.status === 'deactivated') && (school.isActive !== false || school.isActive === undefined)) {
        updates.isActive = false;
        needsUpdate = true;
        schoolResult.changes.push(`Set isActive = false (status: ${school.status}, was: ${school.isActive})`);
      }

      // Fix approved based on status
      if (school.status === 'approved' && school.approved !== true) {
        updates.approved = true;
        needsUpdate = true;
        schoolResult.changes.push('Set approved = true (status: approved)');
      } else if (school.status === 'rejected' && school.approved !== false) {
        updates.approved = false;
        needsUpdate = true;
        schoolResult.changes.push('Set approved = false (status: rejected)');
      }

      // Fix status based on approved
      if (school.approved === true && school.status !== 'approved') {
        updates.status = 'approved';
        updates.isActive = true;
        needsUpdate = true;
        schoolResult.changes.push('Set status = approved, isActive = true (approved: true)');
      }

      if (needsUpdate) {
        await School.findByIdAndUpdate(school._id, updates);
        updatedCount++;
        schoolResult.updated = true;
        
        // Debug: Log Test Massibec after update
        if (school.name === 'Test Massibec') {
          console.log('Test Massibec after fix:', {
            name: school.name,
            updates: updates,
            changes: schoolResult.changes
          });
        }
      }

      results.push(schoolResult);
    }

    res.status(200).json({ 
      message: `Correction terminée! ${updatedCount} écoles mises à jour sur ${schools.length}`,
      results: results
    });

  } catch (error) {
    console.error('Error fixing school status:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
}
