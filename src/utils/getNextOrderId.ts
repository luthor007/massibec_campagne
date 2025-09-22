// utils/getNextOrderId.ts

import Counter from '../models/Counter';

const getNextOrderId = async (): Promise<number> => {
  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'orderId' }, // _id est une chaîne de caractères
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true } // Crée le document si non existant
    );

    return counter.sequence_value;
  } catch (error) {
    console.error('Erreur lors de l\'obtention de next orderId:', error);
    throw error;
  }
};

export default getNextOrderId;