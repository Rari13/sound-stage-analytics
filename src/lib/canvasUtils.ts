export async function generateFinalFlyer(
  imageBase64: string,
  title: string,
  date: string,
  venue: string,
  style: 'neon' | 'bold' | 'minimal' = 'bold'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 1. Configurer le canvas (Format Carré HD pour les réseaux sociaux)
      canvas.width = 1024;
      canvas.height = 1024;

      if (!ctx) return reject("Canvas error");

      // 2. Dessiner l'image de fond générée par l'IA
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // 3. Ajouter un vignettage sombre (Overlay) pour garantir la lisibilité du texte
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "rgba(0,0,0,0.6)"); // Haut sombre pour la date
      gradient.addColorStop(0.3, "rgba(0,0,0,0)"); // Milieu clair pour l'art
      gradient.addColorStop(0.7, "rgba(0,0,0,0)");
      gradient.addColorStop(1, "rgba(0,0,0,0.9)"); // Bas sombre pour le lieu
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.textAlign = 'center';

      // --- DATE (En haut) ---
      ctx.font = '600 30px "Inter", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      ctx.fillText(date.toUpperCase(), canvas.width / 2, 80);
      
      // --- TITRE (En haut, Style "Blockbuster") ---
      // Gestion de la taille de police dynamique
      let fontSize = 130;
      if (title.length > 10) fontSize = 100;
      if (title.length > 20) fontSize = 70;
      
      ctx.font = `900 ${fontSize}px "Inter", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#FFFFFF';
      
      // Ombre portée dure pour effet 3D/Sticker
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,1)";
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.shadowBlur = 15;

      // Wrapping du texte (retour à la ligne automatique)
      const words = title.toUpperCase().split(' ');
      let line = '';
      let y = 120;
      const maxWidth = 900;
      const lineHeight = fontSize * 1.1;

      for(let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          ctx.fillText(line, canvas.width / 2, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width / 2, y);
      ctx.restore();

      // --- LIEU (En bas) ---
      ctx.textBaseline = 'bottom';
      ctx.font = '700 40px "Inter", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 20;
      
      ctx.fillText(venue.toUpperCase(), canvas.width / 2, canvas.height - 60);

      // 5. Exporter en JPEG haute qualité
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject("Blob generation failed");
      }, 'image/jpeg', 0.95);
    };

    img.src = `data:image/png;base64,${imageBase64}`;
  });
}
