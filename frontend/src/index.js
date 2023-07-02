import React from 'react';
import ReactDOM from 'react-dom/client';
import App, { appLoader } from './components/App/App';
import RegisterArtist from './pages/RegisterArtist/RegisterArtist';
import ArtistSongs from './pages/ArtistSongs/ArtistSongs';
import Artists from './pages/Artists/Artists';
import NewArtistSong from './pages/NewArtistSong/NewArtistSong';

import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

import 'bootstrap/dist/css/bootstrap.min.css';

import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById('root'));

const { REACT_APP_SUBGRAPH_ENDPOINT } = process.env;

const apolloClient = new ApolloClient({
  uri: REACT_APP_SUBGRAPH_ENDPOINT,
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'cache-and-network', // Disable caching for queries
    },
    mutate: {
      fetchPolicy: 'cache-and-network', // Disable caching for mutations
    },
  },
});

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
        path: "artists",
        element: <Artists />
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
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  </React.StrictMode>
);
