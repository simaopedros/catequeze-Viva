import { appRoutes } from '../navigation/routes';
import type { CommunityAreaId } from './communityAreas';

export function openCommunityArea(
  router: { push: (href: string) => void },
  area: CommunityAreaId,
  myHandle?: string | null,
) {
  switch (area) {
    case 'feed':
      router.push(appRoutes.community);
      return;
    case 'following':
      router.push(appRoutes.followingFeed);
      return;
    case 'shorts':
      router.push(appRoutes.shorts);
      return;
    case 'search':
      router.push(appRoutes.search);
      return;
    case 'compose':
      router.push(appRoutes.compose);
      return;
    case 'topics':
      router.push(appRoutes.topics);
      return;
    case 'members':
      router.push(appRoutes.members);
      return;
    case 'me':
      if (myHandle) router.push(appRoutes.profile(myHandle));
      else router.push(appRoutes.editProfile);
      return;
    case 'edit':
      router.push(appRoutes.editProfile);
      return;
    case 'blocked':
      router.push(appRoutes.blocked);
      return;
    case 'notifications':
      router.push(appRoutes.notifications);
      return;
  }
}
