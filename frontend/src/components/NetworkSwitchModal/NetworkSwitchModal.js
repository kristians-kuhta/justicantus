import React from 'react';
import Modal from 'react-bootstrap/Modal';

const NetworkSwitchModal = ({ chainName }) => {
  return <Modal
    show={true}
    size="lg"
    aria-labelledby="contained-modal-title-vcenter"
    centered>
    <Modal.Header>
      <Modal.Title>Switch chain</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      Please, switch to the { chainName } chain!
    </Modal.Body>
  </Modal>;
}

export default NetworkSwitchModal;
