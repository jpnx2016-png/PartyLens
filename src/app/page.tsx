"use client";

import JSZip from "jszip";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Photo = { id: string; src: string; alt: string; author: string; size: "tall" | "wide" | "standard"; storagePath?: string };

const starterPhotos: Photo[] = [
  { id: "demo-1", src: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=85", alt: "Balões rosas e decoração de aniversário", author: "Sofia", size: "tall" },
  { id: "demo-2", src: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=900&q=85", alt: "Amigas comemorando com confetes", author: "Marina", size: "standard" },
  { id: "demo-3", src: "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=900&q=85", alt: "Bolo de aniversário com velas", author: "Lia", size: "wide" },
  { id: "demo-4", src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85", alt: "Pessoas aproveitando a festa", author: "Rafa", size: "standard" },
  { id: "demo-5", src: "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=900&q=85", alt: "Amigas brindando durante o jantar", author: "Clara", size: "tall" },
  { id: "demo-6", src: "https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85", alt: "Luzes rosas da festa", author: "Bia", size: "standard" },
  { id: "demo-7", src: "https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=900&q=85", alt: "Mãos segurando taças brilhantes", author: "Noah", size: "wide" },
  { id: "demo-8", src: "https://images.unsplash.com/photo-1496843916299-590492c751f4?auto=format&fit=crop&w=900&q=85", alt: "Detalhes da mesa de aniversário", author: "Sofia", size: "standard" },
];

function Icon({ children }: { children: string }) { return <span aria-hidden="true" className="icon">{children}</span>; }

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>(starterPhotos);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [showFindMe, setShowFindMe] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("gallery");
  const [slideshow, setSlideshow] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [matchIds, setMatchIds] = useState<string[] | null>(null);
  const selfieInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    const loadPhotos = async () => {
      const { data } = await client.from("photos").select("id, url, alt, author, storage_path").order("created_at", { ascending: false });
      if (active && data?.length) setPhotos(data.map((photo, index) => ({ id: photo.id, src: photo.url, alt: photo.alt, author: photo.author, storagePath: photo.storage_path, size: (["tall", "standard", "wide"] as const)[index % 3] })));
    };
    void loadPhotos();
    const channel = client.channel("party-photos-live").on("postgres_changes", { event: "INSERT", schema: "public", table: "photos" }, (payload) => {
      const photo = payload.new as { id: string; url: string; alt: string; author: string; storage_path: string };
      setPhotos((current) => [{ id: photo.id, src: photo.url, alt: photo.alt, author: photo.author, storagePath: photo.storage_path, size: "standard" }, ...current]);
    }).subscribe();
    return () => { active = false; void client.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!slideshow || photos.length === 0) return;
    const timer = window.setInterval(() => setSlideIndex((index) => (index + 1) % photos.length), 3500);
    return () => window.clearInterval(timer);
  }, [slideshow, photos.length]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (!supabase) { setStatus("Configure o Supabase para publicar fotos."); return; }
    setBusy(true); setStatus(`Enviando ${files.length} foto${files.length > 1 ? "s" : ""}...`);
    try {
      for (const file of files) {
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const path = `${crypto.randomUUID()}-${safeName}`;
        const upload = await supabase.storage.from("party-photos").upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
        if (upload.error) throw upload.error;
        const { data: publicFile } = supabase.storage.from("party-photos").getPublicUrl(path);
        const inserted = await supabase.from("photos").insert({ storage_path: path, url: publicFile.publicUrl, alt: `Foto da festa: ${file.name}`, author: "Convidado" }).select("id, url, alt, author, storage_path").single();
        if (inserted.error) throw inserted.error;
      }
      setStatus("Fotos compartilhadas com sucesso.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível enviar as fotos."); }
    finally { setBusy(false); }
  }

  async function downloadAll() {
    setBusy(true); setStatus("Preparando seu álbum...");
    try {
      const zip = new JSZip();
      await Promise.all(photos.map(async (photo, index) => { const response = await fetch(photo.src); if (response.ok) zip.file(`julia-15-${String(index + 1).padStart(2, "0")}.jpg`, await response.blob()); }));
      const blob = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "fotos-julia-15-anos.zip"; link.click(); URL.revokeObjectURL(link.href);
      setStatus("Download pronto.");
    } catch { setStatus("Não foi possível preparar o download."); } finally { setBusy(false); }
  }

  async function findMe(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setStatus("Analisando os rostos...");
    try {
      const faceapi = await import("face-api.js");
      await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri("/models"), faceapi.nets.faceLandmark68Net.loadFromUri("/models"), faceapi.nets.faceRecognitionNet.loadFromUri("/models")]);
      const selfie = await faceapi.bufferToImage(file);
      const query = await faceapi.detectSingleFace(selfie, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
      if (!query) throw new Error("Não encontramos um rosto nessa selfie.");
      const matches: string[] = [];
      for (const photo of photos) {
        const image = await faceapi.fetchImage(photo.src);
        const detections = await faceapi.detectAllFaces(image, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        if (detections.some((face) => faceapi.euclideanDistance(query.descriptor, face.descriptor) < 0.55)) matches.push(photo.id);
      }
      setMatchIds(matches); setShowFindMe(false); setStatus(`${matches.length} foto${matches.length === 1 ? " encontrada" : "s encontradas"}.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Não foi possível buscar seu rosto."); }
    finally { setBusy(false); if (selfieInput.current) selfieInput.current.value = ""; }
  }

  const visiblePhotos = matchIds ? photos.filter((photo) => matchIds.includes(photo.id)) : photos;

  return (
    <main className="app-shell">
      <header className="topbar"><div className="brand-mark"><span className="brand-bow">⌁</span><span>PartyLens</span></div><div className="top-actions"><button className="icon-button" aria-label="Abrir apresentação" onClick={() => setSlideshow(true)}><Icon>▣</Icon></button><button className="icon-button menu-trigger" aria-label="Abrir menu" onClick={() => setShowMenu(!showMenu)}><Icon>•••</Icon></button>{showMenu && <div className="mini-menu"><button onClick={() => setSlideshow(true)}>Abrir apresentação na TV</button><button onClick={() => setStatus("A administração será liberada após configurar uma chave privada no servidor.")}>Acesso administrativo</button></div>}</div></header>
      <section className="hero-section"><div className="hero-copy"><p className="eyebrow">Um álbum compartilhado para</p><h1>Os 15 anos<br /><em>da Julia</em></h1><p className="hero-note">Cada risada, cada brinde, cada pequeno momento.<br />Vamos guardar tudo para sempre.</p></div><div className="hero-art" aria-hidden="true"><span className="ribbon ribbon-one">⌇</span><span className="ribbon ribbon-two">⌇</span><span className="sparkle">✦</span></div></section>
      <section className="tool-row"><button className="find-button" onClick={() => setShowFindMe(true)}><span className="face-icon">◉</span><span><strong>Encontrar fotos minhas</strong><small>Mágica com inteligência artificial</small></span><span className="arrow">→</span></button><button className="download-button" aria-label="Baixar todas as fotos" onClick={() => void downloadAll()} disabled={busy}><Icon>↓</Icon><span>Baixar tudo</span></button></section>
      {matchIds && <button className="clear-filter" onClick={() => { setMatchIds(null); setStatus(""); }}>Mostrar todas as fotos ×</button>}
      <section className="gallery-section"><div className="section-heading"><div><p className="eyebrow">Os momentos</p><h2>Galeria ao vivo <span className="live-dot" /></h2></div><span className="photo-count">{visiblePhotos.length} fotos</span></div>{activeTab === "gallery" ? <div className="masonry-grid">{visiblePhotos.map((photo) => <button key={photo.id} className={`photo-card ${photo.size}`} onClick={() => setSelectedPhoto(photo)}><img src={photo.src} alt={photo.alt} /><span className="photo-credit">{photo.author}</span></button>)}</div> : <div className="empty-state"><span>♡</span><h3>Suas favoritas ficarão aqui</h3><p>Toque no coração de uma foto para salvá-la.</p></div>}</section>
      <label className="upload-fab"><span className="plus">+</span><span>{busy ? "Processando..." : "Compartilhar momento"}</span><input type="file" accept="image/*" multiple onChange={(event) => void handleUpload(event)} disabled={busy} /></label>
      <nav className="bottom-nav"><button className={activeTab === "gallery" ? "active" : ""} onClick={() => setActiveTab("gallery")}><Icon>▦</Icon><span>Galeria</span></button><button className={activeTab === "saved" ? "active" : ""} onClick={() => setActiveTab("saved")}><Icon>♡</Icon><span>Salvas</span></button><button onClick={() => setShowFindMe(true)}><Icon>⌾</Icon><span>Encontrar</span></button></nav>
      {status && <div className="status-toast" role="status">{status}</div>}
      {selectedPhoto && <div className="modal-backdrop" onClick={() => setSelectedPhoto(null)}><div className="lightbox" onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={() => setSelectedPhoto(null)}>×</button><img src={selectedPhoto.src} alt={selectedPhoto.alt} /><div className="lightbox-footer"><span>Compartilhada por {selectedPhoto.author}</span><a href={selectedPhoto.src} download target="_blank" rel="noreferrer"><Icon>↓</Icon> Baixar</a></div></div></div>}
      {showFindMe && <div className="modal-backdrop" onClick={() => setShowFindMe(false)}><div className="find-modal" onClick={(event) => event.stopPropagation()}><button className="close-button" onClick={() => setShowFindMe(false)}>×</button><div className="scan-illustration">◉<span>✦</span></div><p className="eyebrow">Seu buscador particular de fotos</p><h2>Vamos encontrar você<br /><em>nas memórias.</em></h2><p>Faça uma selfie rápida. O reconhecimento acontece no seu navegador e sua selfie nunca é enviada.</p><input ref={selfieInput} className="selfie-input" type="file" accept="image/*" capture="user" onChange={(event) => void findMe(event)} /><button className="primary-button" onClick={() => selfieInput.current?.click()} disabled={busy}>{busy ? "Analisando..." : "Tirar uma selfie"} <span>→</span></button><button className="text-button" onClick={() => setShowFindMe(false)}>Talvez depois</button></div></div>}
      {slideshow && <div className="slideshow"><button className="slideshow-close" onClick={() => setSlideshow(false)}>× Sair da apresentação</button><img src={photos[slideIndex].src} alt={photos[slideIndex].alt} /><div className="slideshow-caption"><span>15 anos da Julia</span><strong>{String(slideIndex + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}</strong></div></div>}
    </main>
  );
}
