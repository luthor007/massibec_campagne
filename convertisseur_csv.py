import csv
import argparse
import datetime

def parse_args():
    parser = argparse.ArgumentParser(description='Convert CSV file with benefit percentage')
    parser.add_argument('input_file', help='Input CSV file path')
    parser.add_argument('output_file', help='Output CSV file path') 
    parser.add_argument('--benefit', type=float, required=True, help='Benefit percentage (e.g. 40.0 for 40%)')
    parser.add_argument('--school_name', type=str, required=True, help='School name')
    parser.add_argument('--school_id', type=str, required=True, help='School ID')
    return parser.parse_args()

# Dictionnaire pour mapper les noms des produits aux numéros des produits
product_mapping = {
    "Quantity - Tarte au fraises": {"id": "01650", "cost": 6},
    "Quantity - Tarte aux pommes et sucre à la crème": {"id": "10650", "cost": 6},
    "Quantity - Tarte aux framboises": {"id": "03650", "cost": 7},
    "Quantity - Tarte aux bleuets": {"id": "04650", "cost": 7},
    "Quantity - Tarte aux pommes": {"id": "05650", "cost": 6},
    "Quantity - Tarte croustade aux pommes": {"id": "06650", "cost": 7},
    "Quantity - Tarte au sucre à la crème": {"id": "02600", "cost": 6},
    #"Sirop Érable": "08650",
    "Quantity - Tarte fraises et rhubarbe": {"id": "09650", "cost": 6},
    "Quantity - Pâté au poulet": {"id": "20675", "cost": 8},
    "Quantity - Pâté à la viande": {"id": "21675", "cost": 8},
    #"4 fruits": "00650",
    #"Pomme et sucre": "10650",
    #"Pouding Chômeur": "22500",
}

def calculate_price(cost, benefit_percentage):
    selling_price = cost + 3  # Prix de vente = cost + 3$
    student_benefit = 3 * (benefit_percentage / 100)  # Profit de l'élève en $
    return selling_price - student_benefit

def convert_csv(input_file, output_file, benefit, school_name, school_id):
    with open(input_file, mode="r", encoding="utf-8") as infile, open(
        output_file, mode="w", encoding="utf-8", newline=""
    ) as outfile:
        reader = csv.DictReader(infile)
        fieldnames = [
            "EDINum",
            "Client              ",
            "Exp ",
            "LivreeA             ",
            "CommandeClient        ",
            "ClientNom                     ",
            "ShipToName                    ",
            "DateCom ",
            "DateLiv ",
            "Line",
            "Produit             ",
            "Qtee  ",
            "Prix     ",
            ""
        ]
        writer = csv.DictWriter(outfile, fieldnames=fieldnames, delimiter='|', lineterminator='\n')
        writer.writeheader()
        
        for row in reader:
            # First read the current EDI number
            with open("edi_num.txt", "r") as edi_num_file:
                edi_num = int(edi_num_file.read().strip())
            
            # Then write the incremented number in a separate operation
            with open("edi_num.txt", "w") as edi_num_file:
                edi_num_file.write(str(edi_num + 1))
                
            line_counter = 1
            for product_name in product_mapping:
                if row.get(product_name, "0") != "0":
                    product_info = product_mapping[product_name]
                    price = calculate_price(product_info["cost"], benefit)
                    
                    converted_row = {
                        "EDINum": edi_num,
                        "Client              ": "",
                        "Exp ": "9",
                        "LivreeA             ": school_id,
                        "CommandeClient        ": f"673019{row.get('Order ID', '')}",
                        "ClientNom                     ": "",
                        "ShipToName                    ": school_name,
                        "DateCom ": datetime.datetime.now().strftime("%Y-%m-%d"),
                        "DateLiv ": datetime.datetime.now().strftime("%Y-%m-%d"),
                        "Line": line_counter,
                        "Produit             ": product_info["id"],
                        "Qtee  ": row.get(product_name, ""),
                        "Prix     ": f"{price:.2f}",
                        "": "",
                    }
                    writer.writerow(converted_row)
                    line_counter += 1

def main():
    args = parse_args()
    convert_csv(args.input_file, args.output_file, args.benefit, args.school_name, args.school_id)
    print(f"Le fichier converti a été enregistré sous {args.output_file}.")

if __name__ == "__main__":
    main()
    