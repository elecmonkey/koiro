import { useParams } from 'react-router';
import { languageName } from '@koiro/shared';
import { pageTitle } from '@/lib/site-config';
import LanguageDetailClient from './LanguageDetailClient';

export default function Page() {
  const { language = '' } = useParams();
  return (
    <>
      <title>{pageTitle(languageName(language))}</title>
      <LanguageDetailClient key={language} language={language} />
    </>
  );
}
