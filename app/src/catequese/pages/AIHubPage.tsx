import { useSearchParams } from 'react-router';
import { AppShell } from '../AppShell';
import { AIHubHome } from '../components/ai-hub/AIHubHome';
import { CreateMeetingFlow } from '../components/ai-hub/CreateMeetingFlow';
import { ImproveContentFlow } from '../components/ai-hub/ImproveContentFlow';
import { GenerateActivityFlow } from '../components/ai-hub/GenerateActivityFlow';
import { GenerateWhatsappFlow } from '../components/ai-hub/GenerateWhatsappFlow';

function HubContent() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');
  const subIntent = searchParams.get('intent');

  // No mode selected → show the task hub home
  if (!mode) {
    return <AIHubHome />;
  }

  // Route to the appropriate flow based on mode
  switch (mode) {
    case 'create-meeting':
      return <CreateMeetingFlow />;

    case 'improve-content':
      return <ImproveContentFlow />;

    case 'generate-activity':
      return <GenerateActivityFlow />;

    case 'generate-whatsapp':
      return <GenerateWhatsappFlow />;

    // Legacy support — redirect to activity or WhatsApp based on subIntent
    case 'support':
      return subIntent === 'whatsapp'
        ? <GenerateWhatsappFlow />
        : <GenerateActivityFlow />;

    default:
      return <AIHubHome />;
  }
}

export default function AIHubPage() {
  return (
    <AppShell>
      <HubContent />
    </AppShell>
  );
}
