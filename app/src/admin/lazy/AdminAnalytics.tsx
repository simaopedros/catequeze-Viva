import { lazyPage } from "../../client/lazyPage";
export default lazyPage(() => import("../dashboards/analytics/AnalyticsPage"));
