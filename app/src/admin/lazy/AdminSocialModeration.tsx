import { lazyPage } from "../../client/lazyPage";
export default lazyPage(() => import("../dashboards/social/SocialModerationPage"));
