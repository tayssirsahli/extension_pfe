

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
    postSelector: 'div.x1n2onr6.x1ja2u2z.x1jx94hy.x1qpq9i9.xdney7k.xu5ydu1.xt3gfkd.x9f619.xh8yej3.x6ikm8r.x10wlt62.xquyuld',
    authorSelector: 'span.xt0psk2',
    textSelector: 'div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.x1vvkbs.x126k92a div[dir="auto"]',
    imageSelector: 'img.x1ey2m1c.xds687c.x5yr21d.x10l6tqk.x17qophe.x13vifvy.xh8yej3.xl1xv1r',
    commentsSelector: 'div.html-div.xdj266r.x11i5rnm.xat24cr.x1mh8g0r.xexx8yu.x4uap5.x18d9i69.xkhd6sd',
  }
};


const rows = [];

let selectedPost = null;


// Détecter la plateforme actuelle
function detectPlatform() {
  const hostname = window.location.hostname;
  if (/linkedin\.com/i.test(hostname)) return 'linkedin';
  if (/x\.com/i.test(hostname) || /twitter\.com/i.test(hostname)) return 'x';
  if (/facebook\.com/i.test(hostname)) return 'facebook';
  return null;
}

// Fonction pour capturer les images visibles
function captureVisibleImages() {
  return Array.from(document.querySelectorAll("img"))
    .filter(img => {
      const rect = img.getBoundingClientRect();
      return rect.width > 50 && rect.height > 50 &&
             rect.top >= 0 && rect.left >= 0 &&
             rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
             rect.right <= (window.innerWidth || document.documentElement.clientWidth);
    })
    .map(img => img.src);
}

// Désélectionner le texte
function deselectText() {
  window.getSelection().removeAllRanges();
  console.log("Texte désélectionné.");
}

// Activer le mode de sélection de post
function enablePostSelection() {
  const platform = detectPlatform();
  if (!platform) {
    console.log("Plateforme non prise en charge.");
    return;
  }

  const config = platformConfigs[platform];
  console.log(`Mode de sélection activé pour ${platform}. Cliquez sur un post.`);

  document.addEventListener("click", (event) => handlePostClick(event, config), { once: true });
}


// Gérer le clic sur un post
function handlePostClick(event, config) {
  const post = event.target.closest(config.postSelector);
  if (post) {
    event.preventDefault();
    event.stopPropagation();


    const author = post.querySelector(config.authorSelector)?.textContent.trim() || "Auteur inconnu";
    let text = post.querySelector(config.textSelector)?.textContent.trim() || "Texte non disponible";
    const image = post.querySelector(config.imageSelector)?.src || "Image non disponible";
    const comments = Array.from(post.querySelectorAll(config.commentsSelector)).map(comment => comment.textContent.trim()) || null;

    const hashtags = extractHashtags(text);
    text = removeHashtagsFromText(text);
    const title = generatePostTitle(text);

    chrome.runtime.sendMessage({
      action: "postSelected",
      data: { platform: detectPlatform(), author, text, image, comments, hashtags, title }
    });

        
    selectedPost = {
      platform: detectPlatform(),
      author,
      text,
      image,
      comments,
      hashtags,
      title
    };

    rows.push(selectedPost);
    

    console.log("Post sélectionné :", { platform: detectPlatform(), author, text, image, comments, hashtags, title });
  } else {
    console.log("Cliquez sur un post.");
  }
}


async function saveSelectedPosts() {
  if (!rows || rows.length === 0) {
    alert("Aucun post à sauvegarder !");
    return;
  }

  // Transformation des données pour correspondre à la structure attendue par le backend
  const dataToSend = rows.map(row => ({
    author: row.author,
    selected_text: row.text,
    image_url: row.image,
    comments: row.comments,
    hashtags: row.hashtags,
    title: row.title,
    platform: row.platform,
  }));

  console.log("Données envoyées :", dataToSend);
  console.log("Données envoyées :", JSON.stringify(dataToSend, null, 2));


  try {
    const response = await fetch("http://localhost:5000/scraped-data/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataToSend, null, 2),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
    }

    const responseData = await response.text();
    alert("Données sauvegardées avec succès !");
    console.log("Réponse du serveur :", responseData);

    // Réinitialisation des données après la sauvegarde
    rows.length = 0;
    selectedPost = null;
  } catch (error) {
    console.error("Erreur lors de la sauvegarde :", error.message);
    alert("Erreur de sauvegarde : " + error.message);

    if (error.message.includes("Session expired")) {
      chrome.tabs.create({ url: "http://localhost:5174/signin" });
    }
  }
}



// Extraire les hashtags
function extractHashtags(text) {
  const hashtagPattern = /#([\wÀ-ÿ]+(?:[-'’][\wÀ-ÿ]+)*)/g;
  const hashtags = [];
  let match;
  while ((match = hashtagPattern.exec(text))) {
    hashtags.push(match[0]);
  }
  return hashtags;
}

// Supprimer les hashtags du texte
function removeHashtagsFromText(text) {
  text = text.replace(/\bhashtag\b\s*/gi, '').trim();
  text = text.replace(/#([\wÀ-ÿ]+(?:[-'’][\wÀ-ÿ]+)*)/g, '').trim();
  return text.replace(/\s+/g, ' ').trim();
}

// Générer un titre basé sur le texte
function generatePostTitle(text) {
  const words = text.split(" ");
  return words.length >= 5 ? words.slice(0, 5).join(" ") : text.length > 0 ? text : "Titre non disponible";
}

// Ajouter un écouteur pour les messages Chrome
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "enablePostSelection") {
    enablePostSelection();
    sendResponse({ status: "success" });
  } else {
    sendResponse({ status: "unknown_action" });
  }
  return true;
});

// Ajouter un bouton Scraper à chaque post avec effet au survol
// Ajouter un bouton Scraper visible et accessible sur chaque post
function addButtonToPosts() {
  const platform = detectPlatform();
  if (!platform) return;

  const config = platformConfigs[platform];
  if (!config) return;

  const observer = new MutationObserver(() => {
    document.querySelectorAll(config.postSelector).forEach(post => {
      // Vérifier si le bouton Scraper a déjà été ajouté
      if (!post.querySelector('.my-extension-btn')) {
        // Création du bouton Scraper
        createScraperButton(post, platform);
      }
    });
  });

  const targetNode = document.querySelector("main") || document.body;
  observer.observe(targetNode, { childList: true, subtree: true });
}

function createScraperButton(post, platform) {
  let scraperBtn = document.createElement("button");
  scraperBtn.innerText = "🔍 Scraper";
  scraperBtn.className = "my-extension-btn";
  scraperBtn.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: #3498db;
    color: white;
    border: none;
    padding: 8px 14px;
    cursor: pointer;
    border-radius: 5px;
    font-size: 14px;
    font-weight: bold;
    box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
    transition: opacity 0.3s ease-in-out;
    opacity: 0; /* Caché par défaut */
    pointer-events: none; /* Désactiver l'interaction quand caché */
  `;

  // Effet au survol
  post.addEventListener("mouseenter", () => {
    scraperBtn.style.opacity = "1";
    scraperBtn.style.pointerEvents = "auto";
  });

  post.addEventListener("mouseleave", () => {
    scraperBtn.style.opacity = "0";
    scraperBtn.style.pointerEvents = "none";
  });

  // Action au clic
  scraperBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    showActionButtons(post, platform);
  });

  post.style.position = "relative";
  post.appendChild(scraperBtn);
}



// Affichage des boutons après le clic sur Scraper
function showActionButtons(post, platform) {
  // Suppression des anciens boutons
  post.querySelectorAll(".action-btn").forEach(btn => btn.remove());

  // Bouton "Sélectionner"
  let selectBtn = document.createElement("button");
  selectBtn.innerText = "✔️ Sélectionner";
  selectBtn.className = "action-btn";
  selectBtn.style.cssText = `
    position: absolute;
    top: 50px;
    right: 10px;
    background-color: #3498db;
    color: white;
    border: none;
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 5px;
    font-size: 14px;
    font-weight: bold;
  `;
  selectBtn.addEventListener("click", () => {
    //alert("Cliquez sur un post pour le sélectionner !");

    enablePostSelection();
  });

  // Bouton "Sauvegarder"
  let saveBtn = document.createElement("button");
  saveBtn.innerText = "💾 Sauvegarder";
  saveBtn.className = "action-btn";
  saveBtn.style.cssText = `
    position: absolute;
    top: 90px;
    right: 10px;
    background-color: #3498db;
    color: black;
    border: none;
    padding: 6px 12px;
    cursor: pointer;
    border-radius: 5px;
    font-size: 14px;
    font-weight: bold;
  `;
  saveBtn.addEventListener("click", () => {
    saveSelectedPosts()
  });


  
  // Ajouter les boutons au post
  post.appendChild(selectBtn);
  post.appendChild(saveBtn);
}



// Exécuter la fonction
addButtonToPosts();
