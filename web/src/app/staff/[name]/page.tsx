import { useParams } from 'react-router';
import { pageTitle } from '@/lib/site-config';
import StaffDetailClient from './StaffDetailClient';

export default function Page() {
  const { name = '' } = useParams();
  return (
    <>
      <title>{pageTitle(name)}</title>
      <StaffDetailClient key={name} name={name} />
    </>
  );
}
