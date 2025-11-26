import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Truck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-toastify'

export default function InscriptionDistributor() {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [formData, setFormData] = useState({
        nomComplet: '',
        email: '',
        motDePasse: '',
        confirmationMotDePasse: '',
        nomEntreprise: '',
        telephone: '',
        adresse: '',
        ville: '',
        codePostal: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrorMessage('');
    };

    const validateForm = () => {
        if (!formData.nomComplet || !formData.email || !formData.motDePasse ||
            !formData.confirmationMotDePasse || !formData.telephone || !formData.adresse) {
            return 'Tous les champs requis doivent être remplis';
        }

        if (formData.motDePasse !== formData.confirmationMotDePasse) {
            return 'Les mots de passe ne correspondent pas';
        }

        if (formData.motDePasse.length < 6) {
            return 'Le mot de passe doit contenir au moins 6 caractères';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return 'Format d\'email invalide';
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        const validationError = validateForm();
        if (validationError) {
            setErrorMessage(validationError);
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch('/api/inscription-distributor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Inscription réussie ! Veuillez vérifier votre email.');
                // Store email for email verification
                sessionStorage.setItem('pendingVerificationEmail', formData.email.toLowerCase().trim());
                // Redirect to email verification page
                setTimeout(() => {
                    router.push('/email-verification');
                }, 1500);
            } else {
                setErrorMessage(data.message || 'Une erreur est survenue lors de l\'inscription');
                toast.error(data.message || 'Une erreur est survenue');
            }
        } catch (error) {
            console.error('Error:', error);
            setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
            toast.error('Une erreur est survenue');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-2xl mx-auto py-8 md:py-12">
                <Card className="border-2 border-orange-200 shadow-xl">
                    <CardHeader className="text-center bg-gradient-to-br from-orange-50 to-red-50 pb-6">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 bg-orange-600 rounded-2xl flex items-center justify-center">
                                <Truck className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <CardTitle className="text-3xl md:text-4xl font-extrabold text-gray-900">
                            Devenir Distributeur
                        </CardTitle>
                        <p className="text-gray-600 mt-2">
                            Créez votre compte pour commencer à enchérissez sur les livraisons
                        </p>
                    </CardHeader>
                    <CardContent className="p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {errorMessage && (
                                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-red-800 text-sm">{errorMessage}</p>
                                </div>
                            )}

                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                    Informations personnelles
                                </h3>

                                <div>
                                    <Label htmlFor="nomComplet" className="text-gray-700">
                                        Nom complet <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="nomComplet"
                                        name="nomComplet"
                                        type="text"
                                        value={formData.nomComplet}
                                        onChange={handleChange}
                                        required
                                        className="mt-1"
                                        placeholder="Jean Dupont"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="email" className="text-gray-700">
                                        Email <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="mt-1"
                                        placeholder="jean.dupont@example.com"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="telephone" className="text-gray-700">
                                        Téléphone <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="telephone"
                                        name="telephone"
                                        type="tel"
                                        value={formData.telephone}
                                        onChange={handleChange}
                                        required
                                        className="mt-1"
                                        placeholder="(514) 123-4567"
                                    />
                                </div>
                            </div>

                            {/* Company Info (Optional) */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                    Informations d'entreprise (optionnel)
                                </h3>

                                <div>
                                    <Label htmlFor="nomEntreprise" className="text-gray-700">
                                        Nom de l'entreprise
                                    </Label>
                                    <Input
                                        id="nomEntreprise"
                                        name="nomEntreprise"
                                        type="text"
                                        value={formData.nomEntreprise}
                                        onChange={handleChange}
                                        className="mt-1"
                                        placeholder="Transport ABC Inc."
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                    Adresse
                                </h3>

                                <div>
                                    <Label htmlFor="adresse" className="text-gray-700">
                                        Adresse <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="adresse"
                                        name="adresse"
                                        type="text"
                                        value={formData.adresse}
                                        onChange={handleChange}
                                        required
                                        className="mt-1"
                                        placeholder="123 Rue Principale"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="ville" className="text-gray-700">
                                            Ville
                                        </Label>
                                        <Input
                                            id="ville"
                                            name="ville"
                                            type="text"
                                            value={formData.ville}
                                            onChange={handleChange}
                                            className="mt-1"
                                            placeholder="Montréal"
                                        />
                                    </div>

                                    <div>
                                        <Label htmlFor="codePostal" className="text-gray-700">
                                            Code postal
                                        </Label>
                                        <Input
                                            id="codePostal"
                                            name="codePostal"
                                            type="text"
                                            value={formData.codePostal}
                                            onChange={handleChange}
                                            className="mt-1"
                                            placeholder="H1A 1A1"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                    Mot de passe
                                </h3>

                                <div>
                                    <Label htmlFor="motDePasse" className="text-gray-700">
                                        Mot de passe <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="motDePasse"
                                        name="motDePasse"
                                        type="password"
                                        value={formData.motDePasse}
                                        onChange={handleChange}
                                        required
                                        className="mt-1"
                                        placeholder="Minimum 6 caractères"
                                        minLength={6}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="confirmationMotDePasse" className="text-gray-700">
                                        Confirmer le mot de passe <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="confirmationMotDePasse"
                                        name="confirmationMotDePasse"
                                        type="password"
                                        value={formData.confirmationMotDePasse}
                                        onChange={handleChange}
                                        required
                                        className="mt-1"
                                        placeholder="Répétez le mot de passe"
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-6 text-lg shadow-lg"
                            >
                                {isSubmitting ? (
                                    <>Création du compte...</>
                                ) : (
                                    <>
                                        Créer mon compte
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>

                            <p className="text-sm text-gray-600 text-center">
                                En vous inscrivant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}

