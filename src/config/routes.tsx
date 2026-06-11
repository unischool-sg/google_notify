import { HasChildrenRoute } from "../types/routes";
import { IndexPage } from "../app/index";

const routes: Array<HasChildrenRoute> = [
  {
    path: "/",
    element: <IndexPage />
  }
];

export { routes }