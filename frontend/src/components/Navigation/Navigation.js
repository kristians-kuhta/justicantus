import React from 'react';

import { Container, Nav, Navbar } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';

const Navigation = ({ account, artist }) => {
  return <Navbar bg='dark' variant='dark' expand='lg'>
    <Container>
      <Navbar.Brand bg='light' href='#home'>Justicantus</Navbar.Brand>
      <Navbar.Toggle aria-controls='top-navbar-nav' />
      <Navbar.Collapse id='top-navbar-nav'>
        <Nav className="w-100 justify-content-between">
          { artist.id == 0 &&
            <NavLink to="artists/register" className="nav-link">
              Artist registration
            </NavLink>
          }
          { artist.id > 0 &&
            <NavLink to={`artists/${artist.id.toHexString()}/songs`} className="nav-link">
              My songs
            </NavLink>
          }

          { artist.id > 0 &&
            <Navbar.Text className="ml-auto">
              <NavLink to={`artists/${artist.id.toHexString()}/songs`}>
                { `${artist.name} (${account.slice(0, 7)}...${account.slice(35, 40)})` }
              </NavLink>
            </Navbar.Text>
          }
        </Nav>
      </Navbar.Collapse>
    </Container>
  </Navbar>;
};

export default Navigation;
