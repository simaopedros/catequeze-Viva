import {
  Ban,
  Bell,
  Hash,
  Heart,
  Pencil,
  PenLine,
  Play,
  Search,
  User,
  Users,
} from 'lucide-react-native';
import type { CommunityAreaId } from './communityAreas';

export const COMMUNITY_AREA_ICONS: Record<CommunityAreaId, typeof Users> = {
  feed: Users,
  following: Heart,
  shorts: Play,
  search: Search,
  compose: PenLine,
  topics: Hash,
  members: Users,
  me: User,
  edit: Pencil,
  blocked: Ban,
  notifications: Bell,
};
