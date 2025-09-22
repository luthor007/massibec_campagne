import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ message: "Non autorisé" });
    }

    const { id } = req.query;
    const client = await clientPromise;
    const db = client.db();

    if (req.method === 'PATCH') {
      const { products } = req.body;
      
      if (!products) {
        return res.status(400).json({ message: "Les données des produits sont requises" });
      }

      const result = await db.collection("orders").updateOne(
        { _id: new ObjectId(id) },
        { $set: { products } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Commande non trouvée" });
      }

      return res.status(200).json({ message: "Commande mise à jour avec succès" });
    }

    return res.status(405).json({ message: "Méthode non autorisée" });
  } catch (error) {
    console.error("Erreur API:", error);
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
} 