import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Alert, Spinner, Card, Row, Col, ListGroup, Badge, Form } from 'react-bootstrap';
import { FaUsers, FaLink, FaTimes, FaCopy, FaClock } from 'react-icons/fa';
import ProjectContext from '../../contexts/ProjectContext';
import projectService, { getProjectSharingInfo, revokeProjectShare } from '../../services/projectService';
import { useNotification } from '../../contexts/NotificationContext';
import './ProjectAccess.css';

export const ProjectAccess = () => {
  const { projectId } = useParams();
  const { showNotification } = useNotification();
  const { extendProjectShare } = useContext(ProjectContext);
  const [sharingInfo, setSharingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [creatingLinks, setCreatingLinks] = useState(false);

  // Separate state for each link type
  const [readerLink, setReaderLink] = useState('');
  const [coOwnerLink, setCoOwnerLink] = useState('');

  const fetchSharingInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getProjectSharingInfo(projectId);
      
      // Handle different response structures
      let sharingData = response.data;
      
      // Check if the response has a nested structure with sharing_info
      if (response.data && response.data.sharing_info) {
        sharingData = response.data.sharing_info;
      }
      
      // Check for valid structure
      if (!sharingData || (!sharingData.share_links && !sharingData.co_owners && !sharingData.readers)) {
        sharingData = {
          share_links: [],
          co_owners: [],
          readers: [],
          total_co_owners: 0,
          total_readers: 0
        };
      }
      
      setSharingInfo(sharingData);
      
      // Handle share links
      let foundReaderLink = '';
      let foundCoOwnerLink = '';
      
      // Check for share URLs directly in the response
      if (response.data && response.data.share_urls) {
        if (response.data.share_urls.reader && response.data.share_urls.reader.length > 0) {
          // Get the first usable reader link, or the first link if none are usable
          const usableReaderLink = response.data.share_urls.reader.find(link => link.can_be_used);
          const firstReaderLink = response.data.share_urls.reader[0];
          foundReaderLink = (usableReaderLink || firstReaderLink).url;
        }
        
        if (response.data.share_urls.co_owner && response.data.share_urls.co_owner.length > 0) {
          // Get the first usable co-owner link, or the first link if none are usable
          const usableCoOwnerLink = response.data.share_urls.co_owner.find(link => link.can_be_used);
          const firstCoOwnerLink = response.data.share_urls.co_owner[0];
          foundCoOwnerLink = (usableCoOwnerLink || firstCoOwnerLink).url;
        }
      }
      
      setReaderLink(foundReaderLink);
      setCoOwnerLink(foundCoOwnerLink);
      
    } catch (err) {
      console.error('Error fetching sharing info:', err);
      setError('Failed to fetch project sharing information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharingInfo();
  }, [projectId]);

  const handleCreateLinks = async () => {
    try {
      setCreatingLinks(true);
      setError(null);
      
      const response = await projectService.createShareLinks(projectId);
      
      if (response.success && response.shareUrls) {
        setReaderLink(response.shareUrls.reader);
        setCoOwnerLink(response.shareUrls.co_owner);
        showNotification('Share links created successfully!', 'success');
        
        // Refresh sharing info to get updated state
        fetchSharingInfo();
      } else if (response.data && response.data.share_urls) {
        // Handle alternative response format
        const shareUrls = response.data.share_urls;
        setReaderLink(shareUrls.reader || '');
        setCoOwnerLink(shareUrls.co_owner || '');
        showNotification('Share links created successfully!', 'success');
        
        // Refresh sharing info to get updated state
        fetchSharingInfo();
      } else {
        setError('Failed to create share links. Please try again.');
      }
    } catch (err) {
      console.error('Error creating share links:', err);
      setError('Failed to create share links. Please try again later.');
    } finally {
      setCreatingLinks(false);
    }
  };

  const handleCopyLink = (link, type) => {
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopiedLink(type);
        setTimeout(() => setCopiedLink(null), 2000);
      })
      .catch(err => {
        console.error('Could not copy link:', err);
        setError('Failed to copy link to clipboard');
      });
  };

  const handleRevokeAccess = async (accessType = null, revokeAccessToo = false) => {
    try {
      setLoading(true);
      
      const response = await revokeProjectShare(
        projectId, 
        Boolean(revokeAccessToo),
        accessType
      );
      
      // Check if successful based on response status and data
      const isSuccess = 
        (response.status >= 200 && response.status < 300) && 
        (!response.data || response.data.success !== false);
      
      if (isSuccess) {
        if (accessType === 'reader') {
          setReaderLink('');
          showNotification(
            `Reader link ${revokeAccessToo ? 'and all reader access ' : ''}revoked successfully`, 
            'success'
          );
        } else if (accessType === 'co_owner') {
          setCoOwnerLink('');
          showNotification(
            `Co-owner link ${revokeAccessToo ? 'and all co-owner access ' : ''}revoked successfully`, 
            'success'
          );
        } else {
          // All access revoked
          setReaderLink('');
          setCoOwnerLink('');
        showNotification(
            `All share links ${revokeAccessToo ? 'and access ' : ''}revoked successfully`, 
          'success'
        );
        }
        
        // Refresh sharing info
        fetchSharingInfo();
      } else {
        setError(`Failed to revoke ${accessType || 'all'} access. ${response.data?.error || ''}`);
      }
    } catch (err) {
      console.error('Error revoking access:', err);
      setError(`Failed to revoke access: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExtendExpiration = async (linkType, extensionHours) => {
    try {
      setLoading(true);
      
      const response = await extendProjectShare(projectId, extensionHours, linkType);
      
      if (response && response.success) {
        showNotification(`${linkType === 'co_owner' ? 'Co-owner' : 'Reader'} link expiration extended by ${extensionHours} hours`, 'success');
        
        // Refresh sharing info to get updated state
        fetchSharingInfo();
      } else {
        setError(`Failed to extend ${linkType === 'co_owner' ? 'Co-owner' : 'Reader'} link expiration. Please try again.`);
      }
    } catch (err) {
      console.error('Error extending share link:', err);
      setError(`Failed to extend link expiration: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const renderShareLinkSection = (linkType, linkUrl, label) => {
    return (
      <Card className="mb-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span><FaLink className="me-2" />{label}</span>
          {linkUrl && (
            <Button 
              variant="outline-danger" 
              size="sm" 
              onClick={() => handleRevokeAccess(linkType, false)}
              disabled={loading}
            >
              <FaTimes /> Revoke Link
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          {linkUrl ? (
            <>
              <div className="d-flex align-items-center mb-3">
                <div className="share-link-container me-2">
                  {linkUrl}
                </div>
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  onClick={() => handleCopyLink(linkUrl, linkType)}
                  disabled={loading}
                >
                  <FaCopy /> {copiedLink === linkType ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              
              <div className="mt-3">
                <Form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    const selected = e.target.elements.extension_hours.value;
                    handleExtendExpiration(linkType, selected);
                  }} 
                  className="d-flex"
                >
                  <Form.Select 
                    name="extension_hours" 
                    className="form-select me-2" 
                    style={{ maxWidth: '150px', flexGrow: 0 }}
                  >
                    <option value="24">24 hours</option>
                    <option value="48">48 hours</option>
                    <option value="72">72 hours</option>
                    <option value="168">1 week</option>
                  </Form.Select>
                  <Button 
                    type="submit" 
                    variant={linkType === 'reader' ? 'outline-info' : 'outline-primary'}
                    disabled={loading}
                    size="sm"
                    className="d-flex align-items-center"
                  >
                    <FaClock className="me-1" /> Extend
                  </Button>
                </Form>
              </div>
            </>
          ) : (
            <p className="text-muted">No active {label.toLowerCase()} available.</p>
          )}
        </Card.Body>
      </Card>
    );
  };

  if (loading && !sharingInfo) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="project-access mb-4">
      <h4 className="mb-3">Project Access Management</h4>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Row className="mb-4">
        <Col md={12}>
          <div className="share-links-section">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5>Share Links</h5>
              <div>
                <Button 
                  variant="primary" 
                  onClick={handleCreateLinks} 
                  disabled={loading || creatingLinks}
                  className="me-2"
                >
                  {creatingLinks ? <Spinner animation="border" size="sm" /> : 'Create Share Links'}
                </Button>
                {(readerLink || coOwnerLink) && (
                  <Button 
                    variant="outline-danger" 
                    onClick={() => handleRevokeAccess(null, false)} 
                    disabled={loading}
                  >
                    Revoke All Links
                  </Button>
                )}
              </div>
            </div>
            
            {/* Reader link section */}
            {renderShareLinkSection('reader', readerLink, 'Reader Link')}
            
            {/* Co-owner link section */}
            {renderShareLinkSection('co_owner', coOwnerLink, 'Co-owner Link')}
          </div>
        </Col>
      </Row>
      
      {sharingInfo && (
        <Row>
          <Col md={12}>
            <Card>
              <Card.Header>
                <div className="d-flex justify-content-between align-items-center">
                  <span><FaUsers className="me-2" />Users with Access</span>
                  {(sharingInfo.co_owners.length > 0 || sharingInfo.readers.length > 0) && (
                  <Button 
                      variant="outline-danger" 
                      onClick={() => handleRevokeAccess(null, true)} 
                    disabled={loading}
                  >
                    Revoke All Access
                  </Button>
                  )}
                </div>
              </Card.Header>
              <Card.Body>
                {sharingInfo.co_owners.length > 0 || sharingInfo.readers.length > 0 ? (
                  <>
                    {sharingInfo.co_owners.length > 0 && (
                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6>Co-owners ({sharingInfo.co_owners.length})</h6>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleRevokeAccess('co_owner', true)} 
                            disabled={loading}
                          >
                            Revoke Co-owner Access
                          </Button>
                        </div>
                        <ListGroup>
                    {sharingInfo.co_owners.map((user, index) => (
                            <ListGroup.Item key={`co-owner-${index}`} className="d-flex justify-content-between align-items-center">
                              <span>{user.name || user.email || 'Unknown User'}</span>
                              <Badge bg="info">Co-owner</Badge>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </div>
                    )}
                    
                    {sharingInfo.readers.length > 0 && (
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6>Readers ({sharingInfo.readers.length})</h6>
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => handleRevokeAccess('reader', true)} 
                            disabled={loading}
                          >
                            Revoke Reader Access
                          </Button>
                        </div>
                        <ListGroup>
                    {sharingInfo.readers.map((user, index) => (
                            <ListGroup.Item key={`reader-${index}`} className="d-flex justify-content-between align-items-center">
                              <span>{user.name || user.email || 'Unknown User'}</span>
                              <Badge bg="secondary">Reader</Badge>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted">No users have access to this project yet.</p>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default ProjectAccess;