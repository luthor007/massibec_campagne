import { google } from 'googleapis';
import { getToken } from 'next-auth/jwt';

// Product mapping and headers setup for Google Sheets
const productHeaders = [
  'Horodatage',
  'Adresse de courriel',
  'Votre Prénom et nom de famille',
  'Numéros de Téléphone ou cellulaire',
  'Croustade aux pommes 650g (12.99$)',
  'Pâté au poulet 650g (15.99$)',
  'Pâté à la viande 650g (14.99$)',
  'Pouding chômeur 500g (10.99$)',
  'Tarte aux 4 fruits 650g (13.99$)',
  'Tarte aux pommes 650g (11.99$)',
  'Tarte aux pommes au sucre 650g (12.99$)',
  'Tarte aux bleuets 650g (13.99$)',
  'Tarte aux fraises 650g (12.99$)',
  'Tarte aux framboises 650g (12.99$)',
  'Tarte à la rhubarbe 650g (12.99$)',
  'Tarte au sirop d\'érable 650g (14.99$)',
  'Tarte au sucre à la crème 600g (13.99$)',
  'Total d\'unité',
  'Total de caisse',
  'Montant $',
  '#commande',
  'Transfère interact faite au montant de',
];

// Google Sheets setup
async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  google.options({ auth: authClient });

  return google.sheets('v4');
}

// Update Google Sheet headers
async function updateSheetHeaders(sheetId) {
  const sheetsClient = await getSheetsClient();
  await sheetsClient.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "'Réponses au formulaire 1'!A1:V1", // Adjust the range as needed
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [productHeaders],
    },
  });
}

// Append order to the Google Sheet
async function appendOrderToSheet(sheetId, orderData) {
  const sheetsClient = await getSheetsClient();
  const response = await sheetsClient.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Réponses au formulaire 1', // Adjust the sheet name if necessary
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [orderData],
    },
  });
  return response;
}

// Product mapping for the Google Sheets row
const productColumnMap = {
  'Croustade aux pommes': 4,
  'Pâté au poulet': 5,
  'Pâté à la viande': 6,
  'Pouding chômeur': 7,
  'Tarte aux 4 fruits': 8,
  'Tarte aux pommes': 9,
  'Tarte aux pommes au sucre': 10,
  'Tarte aux bleuets': 11,
  'Tarte aux fraises': 12,
  'Tarte aux framboises': 13,
  'Tarte à la rhubarbe': 14,
  'Tarte au sirop d\'érable': 15,
  'Tarte au sucre à la crème': 16,
};

// Function to create the row for Google Sheets
function createRowData(userEmail, userName, products, totalAmount, orderId) {
  const rowData = new Array(21).fill('');

  rowData[0] = new Date().toLocaleString();  // Horodatage
  rowData[1] = userEmail;                    // Adresse de courriel
  rowData[2] = userName;                     // Prénom et nom
  rowData[3] = '';                           // Numéro de téléphone

  products.forEach(product => {
    if (productColumnMap[product.name] !== undefined) {
      const colIndex = productColumnMap[product.name];
      rowData[colIndex] = product.quantity;
    }
  });

  rowData[17] = products.reduce((sum, item) => sum + item.quantity, 0);  // Total d'unité
  rowData[18] = totalAmount;                                             // Total de caisse
  rowData[19] = orderId;                                                 // #commande
  rowData[20] = '';                                                      // Transfère interact (to be added later)

  return rowData;
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const { userEmail, userName, products, totalAmount, school, orderId } = req.body;

      // Determine Google Sheet ID based on the school
      let sheetId;
      if (school === 'Chavigny') {
        sheetId = '1t7FPyyvuJdAXaV07qOnaAbikzIors7rOaRKAzLWgouY';
      } else if (school === 'Estacade') {
        sheetId = '1xV7HnDNmyKy5hn-d1eBfZYhxV8HrNE62uzWqLhYHP_k';
      } else if (school === 'SSJ') {
        sheetId = '193tu_pDWzOlcWvSOsAwVdqmHcBqQmJc-Ho61rUErgrw';
      } else {
        return res.status(400).json({ message: 'École non valide' });
      }

      // Update headers first
      await updateSheetHeaders(sheetId);

      // Create the row data for the Google Sheet
      const rowData = createRowData(userEmail, userName, products, totalAmount, orderId);

      // Append the row to the correct Google Sheet
      await appendOrderToSheet(sheetId, rowData);

      res.status(200).json({ message: 'Commande ajoutée avec succès à Google Sheets' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la Google Sheet:', error);
      res.status(500).json({ message: 'Erreur lors de la mise à jour de la Google Sheet' });
    }
  } else {
    res.status(405).json({ message: 'Méthode non autorisée' });
  }
}