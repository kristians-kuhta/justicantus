import React from 'react';
import ReactDOM from 'react-dom/client';
// import './index.css';
import App from './components/App/App';
import RegisterArtist from './pages/RegisterArtist/RegisterArtist';

import 'bootstrap/dist/css/bootstrap.min.css';

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById('root'));

// TODO: consider extracting this to another file
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    // TODO: consider if the error page is needed
    // errorElement: <ErrorPage />,
    children: [
      {
        path: "artists/register",
        element: <RegisterArtist />,
      },
    ],
  },
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
