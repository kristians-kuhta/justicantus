import React from 'react';

import { Container, Nav, Navbar } from 'react-bootstrap';

const Navigation = () => {
  return <Navbar bg='dark' variant='dark' expand='lg'>
    <Container>
      <Navbar.Brand bg='light' href='#home'>Justicantus</Navbar.Brand>
      <Navbar.Toggle aria-controls='top-navbar-nav' />
      <Navbar.Collapse id='top-navbar-nav'>
        <Nav className="me-auto">
          <Nav.Link href="#artist-registration">Artist registration</Nav.Link>
        </Nav>
      </Navbar.Collapse>
    </Container>
  </Navbar>;
};

export default Navigation;
