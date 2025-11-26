// Script to create a blog post
require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
}

// Blog Schema
const BlogSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    excerpt: { type: String, required: true, maxlength: 300 },
    content: { type: String, required: true },
    featuredImage: { type: String, default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    published: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    metaTitle: { type: String, maxlength: 100 },
    metaDescription: { type: String, maxlength: 160 },
    metaKeywords: { type: [String], default: [] },
    categories: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true, lowercase: true }],
    views: { type: Number, default: 0 },
    readingTime: { type: Number, default: 0 }
}, { timestamps: true });

const Blog = mongoose.models.Blog || mongoose.model('Blog', BlogSchema);

// User Schema (simplified)
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['student', 'school_manager', 'supplier', 'admin'], required: true }
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createBlogPost() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find or get the admin user (alexis.massicotte@icloud.com)
        let author = await User.findOne({ email: 'alexis.massicotte@icloud.com' });

        if (!author) {
            console.log('Admin user not found. Please create the blog post manually through the admin dashboard.');
            process.exit(1);
        }

        const title = 'Le guide complet des campagnes de financement scolaire en 2026';
        const slug = 'guide-complet-campagnes-financement-scolaire-2026';

        // Check if blog post already exists
        const existingBlog = await Blog.findOne({ slug });
        if (existingBlog) {
            console.log('Blog post with this slug already exists. Updating...');
            existingBlog.title = title;
            existingBlog.excerpt = 'Découvrez les secrets des campagnes de financement scolaire réussies en 2026. Apprenez comment augmenter la participation des élèves et maximiser vos ventes avec des stratégies éprouvées.';
            existingBlog.content = getFormattedContent();
            existingBlog.metaTitle = title;
            existingBlog.metaDescription = 'Guide complet pour réussir vos campagnes de financement scolaire en 2026. Augmentez la participation et les ventes avec Jappuie.ca';
            existingBlog.metaKeywords = ['financement scolaire', 'campagne de financement', 'école', 'élèves', 'vente', 'Jappuie'];
            existingBlog.categories = ['Guide', 'Financement scolaire'];
            existingBlog.tags = ['financement', 'campagne', 'école', 'élèves', 'guide', '2026'];
            existingBlog.published = true;
            existingBlog.publishedAt = new Date();

            // Calculate reading time
            const wordCount = existingBlog.content.replace(/<[^>]*>/g, '').split(/\s+/).length;
            existingBlog.readingTime = Math.ceil(wordCount / 200);

            await existingBlog.save();
            console.log('Blog post updated successfully!');
            process.exit(0);
        }

        const excerpt = 'Découvrez les secrets des campagnes de financement scolaire réussies en 2026. Apprenez comment augmenter la participation des élèves et maximiser vos ventes avec des stratégies éprouvées.';
        const content = getFormattedContent();

        // Calculate reading time
        const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200);

        const blog = new Blog({
            title,
            slug,
            excerpt,
            content,
            author: author._id,
            metaTitle: title,
            metaDescription: 'Guide complet pour réussir vos campagnes de financement scolaire en 2026. Augmentez la participation et les ventes avec Jappuie.ca',
            metaKeywords: ['financement scolaire', 'campagne de financement', 'école', 'élèves', 'vente', 'Jappuie'],
            categories: ['Guide', 'Financement scolaire'],
            tags: ['financement', 'campagne', 'école', 'élèves', 'guide', '2026'],
            published: true,
            publishedAt: new Date(),
            readingTime
        });

        await blog.save();
        console.log('Blog post created successfully!');
        console.log(`Title: ${title}`);
        console.log(`Slug: ${slug}`);
        console.log(`Reading time: ${readingTime} minutes`);

    } catch (error) {
        console.error('Error creating blog post:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

function getFormattedContent() {
    return `
<h2>Présenté par Jappuie.ca</h2>

<p>Il y a de cela quelques années, mon école secondaire lançait sa traditionnelle campagne de financement pour les sports extrascolaires juste avant le temps des fêtes. En 2021, les résultats de cette campagne étaient incontestablement incroyables. J'étais en secondaire 1 à cette époque et je n'étais pas très impliqué dans la vie scolaire, donc comme certains de mes amis j'avais décidé de payer ma part au lieu de participer et d'essayer de vendre des produits pour cette campagne. Heureusement pour l'école, cette tendance de désengagement n'était pas encore généralisée, car des rumeurs circulaient que certains participants avaient vendu des centaines de produits et généré plusieurs milliers de dollars de ventes à eux seuls :0 !!!</p>

<p>Je trouvais cela vraiment incroyable de voir une telle motivation en plus du fait que 100% des profits étaient envoyés à l'école, donc les élèves n'avaient aucun avantage personnel à vendre autant.</p>

<h3>Revirement de situation</h3>

<p>Deux ans après cette campagne super réussie, l'école l'avait abandonnée par manque d'engagement. Ils ont pivoté vers un modèle de tirage pour un voyage dans le Sud où les élèves vendent 10 coupons de participation à 20$ chacun qu'ils sont obligés d'acheter pour… 200$!!! J'ai participé à cette campagne par obligation. Bien entendu, je n'ai vendu aucun billet de tirage. De plus, je n'ai même pas pris la peine d'inscrire mon nom sur les coupons et de les remettre à l'école ☹. Certes, l'école a fait beaucoup d'argent grâce à cette campagne, mais un dégoût général s'est fait ressentir. On venait à se demander ce qu'il était arrivé des temps où les élèves vendaient par pur plaisir des produits du temps des fêtes et pourquoi cette activité avait laissé sa place à un prélèvement automatique de 200$ obligatoire (eh oui, un autre de plus) aux couleurs des Bahamas.</p>

<p>Ceci m'a amené à me poser deux questions bien spécifiques :</p>

<ul>
  <li><strong>Quels sont les paramètres du succès d'une campagne de financement?</strong></li>
  <li><strong>Que faut-il changer en 2026 pour recréer cet énorme engouement très lucratif pour nos écoles?</strong></li>
</ul>

<p>Il faut principalement s'attarder à deux statistiques :</p>

<ol>
  <li><strong>Le taux de participation des élèves à la campagne</strong><br>(élèves ayant vendu ÷ le nombre total d'élèves)</li>
  <li><strong>La quantité moyenne de produits vendus par élève participant</strong></li>
</ol>

<p><strong>C'est tout.</strong></p>

<p>Donc cela nous amène à nous demander comment faire pour augmenter le taux de participation aux campagnes de financement (1) et comment augmenter les ventes des élèves qui y participent (2).</p>

<h2>Étape 1: augmenter le taux de participation</h2>

<p>Toutes nos données montrent que le lancement de la campagne est l'étape la plus importante en ce qui a trait au taux d'activation. Il y a deux mondes entre : envoyer un simple message aux parents, et faire une assemblée générale d'une heure seulement sur la campagne + faire un carton explicatif personnalisé à chaque élève avec un code QR, une compétition entre chaque classe et des prix extraordinaires. Certes, il ne faut pas dépasser les limites, mais donner seulement un tantinet plus d'effort lors du lancement de la campagne et une raison claire pour la levée de fonds peut créer une différence massive de résultats (jusqu'à 10x plus de ventes).</p>

<blockquote>
  <p>Heureusement, Jappuie.ca vous offre un consultant qui vous aide à avoir un début de campagne réussi ainsi qu'un kit de lancement dans lequel il y a toutes les procédures opérationnelles prêtes à exécuter étape par étape. Ensuite, Jappuie.ca a des deals avec plusieurs entreprises locales comme Sports Experts pour offrir des rabais et récompenses si l'élève s'inscrit et vend son premier produit.</p>
</blockquote>

<h2>Étape 2: augmenter les ventes</h2>

<p>Les élèves ne sont pas tous des saints qui vont faire le tour de leur quartier en porte-à-porte et demander à tous ceux qu'ils croisent de soutenir leur campagne de financement. Encore moins s'ils savent pertinemment qu'ils n'obtiendront rien en retour. Pour augmenter vos ventes, il faut que la récompense surpasse largement l'effort et les sacrifices émis par les élèves.</p>

<p><strong>"Qu'est-ce que j'y gagne?"</strong> — vous devez trouver un moyen puissant de répondre à cette question, et la réponse devra être un désir fort de vos élèves.</p>

<p>L'image ci-dessous montre l'équation de la valeur inventée par Alex Hormozi (un businessman américain très populaire). En bref, pour motiver vos élèves (ou n'importe qui en réalité) à faire ce que vous voulez, il faut maximiser les variables du haut :</p>

<ul>
  <li><strong>Variable 1</strong> - Le résultat de rêve qu'ils obtiendront s'ils font ce que vous demandez</li>
  <li><strong>Variable 2</strong> - Les probabilités perçues que le résultat de rêve se matérialise</li>
</ul>

<p>Et minimiser les variables du bas :</p>

<ul>
  <li><strong>Variable 3</strong> - Le temps d'attente avant d'obtenir le résultat</li>
  <li><strong>Variable 4</strong> - Les efforts et les sacrifices nécessaires pour obtenir le résultat</li>
</ul>

<p>Si nous prenons le temps de réfléchir, le résultat espéré par les élèves tourne autour de ceci : gagner de l'argent, augmenter son statut au sein de ses pairs, obtenir un objet tangible qu'ils souhaitent depuis longtemps, avoir un privilège exclusif, obtenir une récompense rapidement, etc.</p>

<h3>Comment Jappuie.ca maximise la valeur pour vos élèves</h3>

<p>Sur Jappuie.ca, il est possible de configurer comme bon vous semble la séparation des profits et prix de vente de chaque produit. À cet égard, certaines écoles ont décidé de laisser la totalité des profits aux élèves, et les statistiques de vente en ont été améliorées. Il y a aussi un espace pour laisser des dons aux élèves et aux écoles. Les dons représentent aujourd'hui +20% des profits réalisés par les élèves, ce qui est non négligeable pour une campagne axée sur la vente de produits.</p>

<p>Deuxièmement, sur Jappuie.ca il y a des fonctionnalités de compétition très avancées comme une compétition par groupe (classe, équipe sportive, etc.) et des compétitions individuelles au sein des groupes. Donc, un élève qui vend beaucoup et fait gagner son groupe gagne beaucoup de statut et encourage les autres à participer, créant un cercle vertueux pour votre campagne.</p>

<p>Ensuite, notre gamme d'outils de vente présents sur notre plateforme réduit grandement les efforts nécessaires à la vente de produits, comme notre générateur d'affiche personnalisé, une boutique en ligne et des campagnes d'email marketing pour motiver leurs clients à recommander.</p>

<p>De plus, grâce à notre chaîne YouTube qui montre des études de cas concrets d'élèves ayant réussi à vendre +1000$, on augmente les probabilités perçues dans la tête des élèves que le résultat de rêve se matérialise.</p>

<h2>Lancer votre campagne</h2>

<p>Il est maintenant temps de lancer votre campagne. Les campagnes de financement, c'est un projet, et comme tout projet qui en vaut la peine, il faut travailler dur pour qu'il se matérialise avec succès. Seulement, qui a dit que c'était vous qui deviez travailler dur? Laissez-nous gérer toute la complexité de votre campagne de financement et se casser la tête sans arrêt pendant que vous encaissez les profits.</p>

<p><strong>Inscrivez-vous maintenant, sans engagement, sur <a href="https://jappuie.ca/ecole">https://jappuie.ca/ecole</a> et je vous souhaite le meilleur pour votre campagne de financement!</strong></p>

<p><em>Alexis Massicotte<br>CEO de Jappuie.ca</em></p>
  `.trim();
}

createBlogPost();

