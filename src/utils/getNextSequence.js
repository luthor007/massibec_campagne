// utils/getNextSequence.js

import Counter from '../models/Counter';

export async function getNextSequence(name) {
  const updatedCounter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return updatedCounter.sequence_value;
}