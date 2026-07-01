import { useParams } from 'react-router';
import { ContentDocumentWorkspace } from '../components/content/ContentDocumentWorkspace';

export default function EditContentPage() {
  const { id } = useParams<{ id: string }>();
  return <ContentDocumentWorkspace existingContentId={id} />;
}
