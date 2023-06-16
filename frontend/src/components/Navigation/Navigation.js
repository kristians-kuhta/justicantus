import React from 'react';

import { Container, Nav, Navbar } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';

const Navigation = () => {
  return <Navbar bg='dark' variant='dark' expand='lg'>
    <Container>
      <Navbar.Brand bg='light' href='#home'>Justicantus</Navbar.Brand>
      <Navbar.Toggle aria-controls='top-navbar-nav' />
      <Navbar.Collapse id='top-navbar-nav'>
        <Nav className="me-auto">
          <NavLink to="artists/register" className="nav-link">
            Artist registration
          </NavLink>
        </Nav>
      </Navbar.Collapse>
    </Container>
  </Navbar>;
};

export default Navigation;
