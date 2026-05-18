import { useRouter } from 'next/router';
import Link from 'next/link';
import CameraExperience from '../components/camera/CameraExperience';

export const getServerSideProps = async () => ({ props: {} });

export default function CameraPage() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-40" style={{ background: '#000' }}>
      <CameraExperience onClose={() => router.push('/chats')} />
      <Link
        href="/gallery"
        className="absolute top-4 right-16 z-[60] font-mono text-[10px] px-2 py-1 rounded-sm"
        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid #252535', color: '#00F5FF' }}
      >
        GALLERY
      </Link>
    </div>
  );
}
