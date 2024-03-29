import React from 'react';

import { Container, Nav, Navbar } from 'react-bootstrap';
import { NavLink } from 'react-router-dom';

const Navigation = ({ account, loggedInArtist, subscriber }) => {
  return <Navbar bg='dark' variant='dark' expand='lg'>
    <Container>
      <Navbar.Brand bg='light' href='/'>Justicantus</Navbar.Brand>
      <Navbar.Toggle aria-controls='top-navbar-nav' />
      <Navbar.Collapse id='top-navbar-nav'>
        <Nav className="w-100 justify-content-between">
          <div className="d-flex">
            { loggedInArtist.id.toString() === '0' && !subscriber &&
                <>
                  <NavLink to="artists/register" className="nav-link">
                    Become an artist
                  </NavLink>
                  <NavLink to="users/subscription" className="nav-link">
                    Subscribe
                  </NavLink>
                </>
            }

            { subscriber && <NavLink to="users/subscription" className="nav-link">
                Fund subscription
              </NavLink>
            }

            { loggedInArtist.id > 0 &&
              <NavLink to={`artists/${account}/dashboard`} className="nav-link">
                Dashboard
              </NavLink>
            }
            { loggedInArtist.id > 0 &&
              <NavLink to={`artists/${account}/songs`} className="nav-link">
                My songs
              </NavLink>
            }

            <NavLink to={`artists`} className="nav-link">
              Artists
            </NavLink>
          </div>

          { loggedInArtist.id > 0 && !subscriber &&
            <Navbar.Text className="ml-auto">
              <NavLink to={`artists/${account}/songs`}>
                { `${loggedInArtist.name} (${account.slice(0, 7)}...${account.slice(37, 42)})` }
              </NavLink>
            </Navbar.Text>
          }

          { subscriber && !(loggedInArtist.id > 0) &&
            <Navbar.Text className="ml-auto">
              <NavLink to="users/subscription">
                { `${subscriber.slice(0, 7)}...${subscriber.slice(37, 42)}` }
              </NavLink>
            </Navbar.Text>
          }
        </Nav>
      </Navbar.Collapse>
    </Container>
  </Navbar>;
};

export default Navigation;
