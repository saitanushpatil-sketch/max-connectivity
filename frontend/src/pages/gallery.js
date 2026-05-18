import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import BottomNav from '../components/ui/BottomNav';
import { getGalleryPhotos, deleteGalleryPhoto, downloadPhoto } from '../utils/galleryStorage';
import useToast from '../hooks/useToast';

export const getServerSideProps = async () => ({ props: {} });

export default function GalleryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [photos, setPhotos] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const pressRef = useRef(null);

  const load = useCallback(() => setPhotos(getGalleryPhotos()), []);

  useEffect(() => {
    load();
  }, [load]);

  const onLongStart = (id) => {
    pressRef.current = setTimeout(() => setMenuId(id), 500);
  };
  const onLongEnd = () => {
    clearTimeout(pressRef.current);
  };

  return (
    <div className="flex flex-col h-full pb-16 overflow-y-auto">
      <div className="px-4 pt-10 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid #252535' }}>
        <div>
          <div className="font-mono text-[10px] tracking-widest mb-0.5" style={{ color: '#6B6B8A' }}>SYS://GALLERY</div>
          <h1 className="font-heading text-2xl font-bold tracking-wider" style={{ color: '#00F5FF' }}>PHOTOS</h1>
        </div>
        <button type="button" onClick={() => router.push('/camera')} className="font-mono text-[10px] px-3 py-1 rounded-sm" style={{ border: '1px solid #00F5FF', color: '#00F5FF' }}>
          OPEN CAM
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
          <p className="font-mono text-xs text-center" style={{ color: '#6B6B8A' }}>NO CAPTURES YET</p>
          <button type="button" onClick={() => router.push('/camera')} className="hud-btn hud-btn-primary px-6 py-2 rounded-sm text-sm">
            LAUNCH CAMERA
          </button>
        </div>
      ) : (
        <div className="p-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              className="aspect-square rounded-sm overflow-hidden relative"
              style={{ border: '1px solid #252535' }}
              onClick={() => setViewer(p)}
              onTouchStart={() => onLongStart(p.id)}
              onTouchEnd={onLongEnd}
              onMouseDown={() => onLongStart(p.id)}
              onMouseUp={onLongEnd}
              onMouseLeave={onLongEnd}
            >
              <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-[80] flex flex-col" style={{ background: '#0A0A0F' }}>
          <button type="button" className="absolute top-4 left-4 z-10 px-3 py-1 font-mono text-sm" style={{ color: '#00F5FF' }} onClick={() => setViewer(null)}>← BACK</button>
          <img src={viewer.dataUrl} alt="" className="flex-1 object-contain w-full" />
        </div>
      )}

      {menuId && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="p-4 rounded-sm w-64 flex flex-col gap-2" style={{ background: '#12121A', border: '1px solid #252535' }}>
            <button type="button" className="hud-btn py-2 text-sm" style={{ border: '1px solid #00F5FF', color: '#00F5FF' }} onClick={() => { const p = photos.find((x) => x.id === menuId); if (p) downloadPhoto(p.dataUrl); setMenuId(null); toast.success('Downloaded'); }}>DOWNLOAD</button>
            <button type="button" className="hud-btn py-2 text-sm" style={{ color: '#FF006E' }} onClick={() => { deleteGalleryPhoto(menuId); setMenuId(null); load(); toast.info('Deleted'); }}>DELETE</button>
            <button type="button" className="font-mono text-xs" style={{ color: '#6B6B8A' }} onClick={() => setMenuId(null)}>CANCEL</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
