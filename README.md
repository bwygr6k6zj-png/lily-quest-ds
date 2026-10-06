# 🎮 Lily Quest DS

Un petit RPG de capture de monstres façon console DS, jouable dans le navigateur (ordinateur et téléphone).

- Deux écrans : le monde et les combats en haut, les menus tactiles en bas
- 12 Monstres originaux, 7 types, évolutions au niveau 16
- Hautes herbes, captures, dresseurs, Centre de soin et un Champion à battre
- Comptes joueurs (pseudo + mot de passe) : chacun a sa partie, sauvegardée en ligne
- Mode « sans compte » : sauvegarde sur l'appareil uniquement

## Commandes

| Action | Clavier | Tactile |
| --- | --- | --- |
| Bouger | Flèches / ZQSD / WASD | Croix |
| A (valider, parler) | Espace / Entrée | Bouton A ou toucher l'écran |
| B (retour) | Échap | Bouton B |
| Menu | M | X ou START |
| Son on/off | N | Y ou SELECT |

## Lancer en local

Aucune installation : ouvre `index.html`, ou lance un petit serveur :

```bash
python3 -m http.server 8000
```

## Mise en ligne

Le jeu est statique (HTML/CSS/JS). Les comptes passent par deux fonctions Vercel dans `api/` :

- `api/auth.js` : création de compte, connexion, déconnexion (mots de passe hachés avec scrypt, sessions de 30 jours)
- `api/save.js` : lecture et écriture de la partie du joueur connecté

Elles stockent les données dans une base **Upstash Redis** (onglet *Storage* du projet Vercel), qui fournit les variables
`KV_REST_API_URL` et `KV_REST_API_TOKEN`. Sans base, ou en local, le jeu passe tout seul en mode hors ligne.
