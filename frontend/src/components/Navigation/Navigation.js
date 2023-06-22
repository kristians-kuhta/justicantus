import React from 'react';

import { Container, Nav, Navbar } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';

const Navigation = ({ account, loggedInArtist }) => {
  return <Navbar bg='dark' variant='dark' expand='lg'>
    <Container>
      <Navbar.Brand bg='light' href='#home'>Justicantus</Navbar.Brand>
      <Navbar.Toggle aria-controls='top-navbar-nav' />
      <Navbar.Collapse id='top-navbar-nav'>
        <Nav className="w-100 justify-content-between">
          { !loggedInArtist.id &&
            <NavLink to="artists/register" className="nav-link">
              Artist registration
            </NavLink>
          }
          { loggedInArtist.id &&
            <NavLink to={`artists/${account}/songs`} className="nav-link">
              My songs
            </NavLink>
          }

          { loggedInArtist.id &&
            <Navbar.Text className="ml-auto">
              <NavLink to={`artists/${account}/songs`}>
                { `${loggedInArtist.name} (${account.slice(0, 7)}...${account.slice(37, 42)})` }
              </NavLink>
            </Navbar.Text>
          }
        </Nav>
      </Navbar.Collapse>
    </Container>
  </Navbar>;
};

export default Navigation;
