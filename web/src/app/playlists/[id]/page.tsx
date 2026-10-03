import { useParams } from 'react-router';
import PlaylistDetailClient from './PlaylistDetailClient';

export default function Page() {
  const { id = '' } = useParams();
  return <PlaylistDetailClient key={id} playlistId={id} />;
}
