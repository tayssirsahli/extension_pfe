// Configuration des sélecteurs pour chaque plateforme
const platformConfigs = {
  linkedin: {
    postSelector: 'div.fie-impression-container', // Sélecteur pour un post LinkedIn
    authorSelector: 'span.visually-hidden',
    textSelector: 'div.feed-shared-update-v2__description',
    imageSelector: 'img.update-components-image__image',
    commentsSelector: 'div.comments-comments-list',

  },
  x: {
    postSelector: 'div.css-175oi2r.r-eqz5dr.r-16y2uox.r-1wbh5a2', // Sélecteur pour un tweet
    authorSelector: 'span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3',
    textSelector: 'span.css-1jxf684.r-bcqeeo.r-1ttztb7.r-qvutc0.r-poiln3',
    imageSelector: 'img.css-9pa8cd',
    commentsSelector: 'div.css-175oi2r',

  },
  facebook: {
    postSelector: 'div.x1n2onr6.x1ja2u2z.x1jx94hy.x1qpq9i9.xdney7k.xu5ydu1.xt3gfkd.x9f619.xh8yej3.x6ikm8r.x10wlt62.xquyuld', // Cible les posts
    authorSelector: 'span.xt0psk2', // Cible le nom de l'auteur
    textSelector: 'div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs.x126k92a div[dir="auto"]', // Texte du post
    imageSelector: 'img.x1ey2m1c.xds687c.x5yr21d.x10l6tqk.x17qophe.x13vifvy.xh8yej3.xl1xv1r', // Images dans le post
    commentsSelector: 'div.html-div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd', // Commentaires

  }
};

// Détecter la plateforme actuelle
function detectPlatform() {
  const hostname = window.location.hostname;
  if (/linkedin\.com/i.test(hostname)) return 'linkedin';
  if (/x\.com/i.test(hostname) || /twitter\.com/i.test(hostname)) return 'x';
  if (/facebook\.com/i.test(hostname)) return 'facebook';
  return null; // Plateforme non prise en charge
}

// Fonction pour capturer les images visibles dans la fenêtre
function captureVisibleImages() {
  return Array.from(document.querySelectorAll("img"))
    .filter((img) => {
      const rect = img.getBoundingClientRect();
      return (
        rect.width > 50 && rect.height > 50 && // Filtrer les petites images
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      );
    })
    .map((img) => img.src); // Retourne les URLs des images visibles
}

// Fonction pour désélectionner le texte
function deselectText() {
  window.getSelection().removeAllRanges(); // Désélectionne tout le texte sélectionné
  console.log("Texte désélectionné.");
}

// Fonction pour activer le mode de sélection de post
function enablePostSelection() {
  const platform = detectPlatform();
  if (!platform) {
    console.log("Plateforme non prise en charge.");
    return;
  }

  const config = platformConfigs[platform];
  console.log(`Mode de sélection de post activé pour ${platform}. Cliquez sur un post pour le sélectionner.`);

  document.addEventListener("click", (event) => handlePostClick(event, config), { once: true });
}

// Fonction pour gérer le clic sur un post
function handlePostClick(event, config) {
  const post = event.target.closest(config.postSelector);
  if (post) {
    event.preventDefault(); // Empêcher tout comportement par défaut
    event.stopPropagation(); // Empêcher la propagation de l'événement

    // Récupérer les données du post
    const author = post.querySelector(config.authorSelector)?.textContent.trim() || "Auteur inconnu";
    var text = post.querySelector(config.textSelector)?.textContent.trim() || "Texte non disponible";
    const image = post.querySelector(config.imageSelector)?.src || "Image non disponible";
    const comments = Array.from(post.querySelectorAll(config.commentsSelector)).map(comment => comment.textContent.trim()) || [];


    // Extraction des hashtags du texte et suppression des hashtags dans le texte
    const hashtags = extractHashtags(text);
    text = removeHashtagsFromText(text); // Supprimer les hashtags du texte

    // Générer un titre basé sur le texte (par exemple, les 5 premiers mots du texte)
    const title = generatePostTitle(text);

    // Envoyer les données au script de fond
    chrome.runtime.sendMessage({
      action: "postSelected",
      data: {
        platform: detectPlatform(),
        author,
        text,
        image,
        comments,
        hashtags,
        title
      }
    });

    console.log("Post sélectionné :", { platform: detectPlatform(), author, text, image, comments ,hashtags, title});
  } else {
    console.log("Cliqué en dehors d'un post. Veuillez sélectionner un post.");
  }
}




function extractHashtags(text) {
  const hashtagPattern = /#([\wÀ-ÿ]+(?:[-'’][\wÀ-ÿ]+)*)/g;  
  const hashtags = [];
  let match;
  while (match = hashtagPattern.exec(text)) {
    hashtags.push(match[0]); // Ajoute le hashtag trouvé
  }
  console.log(hashtags);
  return hashtags;
}


function removeHashtagsFromText(text) {
  // Supprime tous les mots "hashtag" (avec ou sans espace)
  text = text.replace(/\bhashtag\b\s*/gi, '').trim();

  // Supprime tous les hashtags (#mot)
  text = text.replace(/#([\wÀ-ÿ]+(?:[-'’][\wÀ-ÿ]+)*)/g, '').trim();

  // Nettoie les espaces en trop
  return text.replace(/\s+/g, ' ').trim();
}



function generatePostTitle(text) {
  const words = text.split(" ");
  const title = words.slice(0, 5).join(" ");
  return title.length > 0 ? title : "Titre non disponible";
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "enablePostSelection") {
    enablePostSelection();
    sendResponse({ status: "success" });
  } else {
    sendResponse({ status: "unknown_action" });
  }
  return true; // Indique que la réponse sera envoyée de manière asynchrone
});