import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { LoginPage } from "./components/LoginPage";
import { DashboardPage } from "./components/DashboardPage";
import { UploadFormPage } from "./components/UploadFormPage";
import { FillFormPage } from "./components/FillFormPage";
import { RidersListPage } from "./components/RidersListPage";
import { RiderDetailPage } from "./components/RiderDetailPage";
import { FormDetailPage } from "./components/FormDetailPage";
import { AdminManagePage } from "./components/AdminManagePage";
import AnonymousDashboard from "./components/AnonymousDashboard";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: DashboardPage },
      { path: "upload", Component: UploadFormPage },
      { path: "forms/new", Component: FillFormPage },
      { path: "forms/:formId/edit", Component: FillFormPage },
      { path: "forms/:formId", Component: FormDetailPage },
      { path: "riders", Component: RidersListPage },
      { path: "riders/:riderId", Component: RiderDetailPage },
      { path: "admin/:section", Component: AdminManagePage },
      {path: "analytics", Component: AnonymousDashboard}
    ],
  },
]);
