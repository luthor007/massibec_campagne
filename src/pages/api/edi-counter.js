import dbConnect from '../../lib/mongodb';
import EdiCounter from '../../models/EdiCounter';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      let counter = await EdiCounter.findOne({ _id: 'edi' });
      if (!counter) {
        counter = await EdiCounter.create({ _id: 'edi', value: 9000999 });
      }
      res.status(200).json({ value: counter.value });
    } catch (error) {
      console.error('Error getting EDI counter:', error);
      res.status(500).json({ error: 'Failed to get EDI counter' });
    }
  } else if (req.method === 'POST') {
    try {
      const { increment } = req.body;
      let counter = await EdiCounter.findOne({ _id: 'edi' });
      if (!counter) {
        counter = await EdiCounter.create({ _id: 'edi', value: 9000999 });
      }
      
      const oldValue = counter.value;
      counter.value += increment;
      await counter.save();
      
      res.status(200).json({ 
        startValue: oldValue,
        endValue: counter.value 
      });
    } catch (error) {
      console.error('Error updating EDI counter:', error);
      res.status(500).json({ error: 'Failed to update EDI counter' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 