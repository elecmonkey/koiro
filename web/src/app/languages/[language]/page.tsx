import { useParams } from 'react-router';
import { getLanguageName } from '@/lib/languages';
import { pageTitle } from '@/lib/site-config';
import LanguageDetailClient from './LanguageDetailClient';

export default function Page() {
  const { language = '' } = useParams();
  return (
    <>
      <title>{pageTitle(getLanguageName(language))}</title>
      <LanguageDetailClient key={language} language={language} />
    </>
  );
}
