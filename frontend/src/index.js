import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { appLoader } from './components/App/App';
import RegisterArtist from './pages/RegisterArtist/RegisterArtist';
import ArtistSongs from './pages/ArtistSongs/ArtistSongs';
import NewArtistSong from './pages/NewArtistSong/NewArtistSong';

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
    id: 'root',
    loader: appLoader,
    children: [
      {
        path: "artists/register",
        element: <RegisterArtist/>,
      },
      {
        path: "artists/:artistAddress/songs",
        element: <ArtistSongs />
      },
      {
        path: "artists/:artistAddress/songs/new",
        element: <NewArtistSong />
      }
    ],
  },
]);

root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
