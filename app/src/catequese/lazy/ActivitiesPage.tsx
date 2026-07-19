import { lazyPage } from "../../client/lazyPage";
export default lazyPage(() => import("../pages/ActivitiesPage"));
