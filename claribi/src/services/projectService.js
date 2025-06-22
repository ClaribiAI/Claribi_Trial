import api from './api';

// Define individual methods 
const getProjects = async (page = 1, perPage = 50, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page,
        per_page: perPage,
        ...filters
      });
      const response = await api.get(`/projects?${params}`);
      return {
        items: response.data.items || [],
        metadata: response.data.metadata || {}
      };
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Failed to list projects');
      }
      throw error;
    }
};

const getRecentProjects = async (limit = 5) => {
    try {
      const params = new URLSearchParams({
        page: 1,
        per_page: limit,
        sort: 'updated_at',
        order: 'desc'
      });
      const response = await api.get(`/projects?${params}`);
      return {
        items: response.data.items || [],
        metadata: response.data.metadata || {}
      };
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Failed to list recent projects');
      }
      throw error;
    }
};
  
const getProject = async (projectId) => {
    try {
      const response = await api.get(`/project/${projectId}`);
      return response.data;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 404:
            throw new Error('Project not found');
          case 403:
            throw new Error('Access denied');
          default:
            throw new Error(error.response.data.error || 'Failed to get project');
        }
      }
      throw error;
    }
};
  
const createProject = async (projectData) => {
    try {
      const data = {
        name: projectData.name || '',
        description: projectData.description || ''
      };
      
      const response = await api.post('/project/create', data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 400) {
        throw new Error(error.response.data.error || 'Validation error');
      }
      throw new Error('Failed to create project');
    }
};
  
const editProject = async (projectId, projectData) => {
    try {
      const response = await api.post(`/project/${projectId}/edit`, projectData);
      return response.data;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            throw new Error(error.response.data.error || 'Validation error');
          case 404:
            throw new Error('Project not found');
          case 403:
            throw new Error('Access denied');
          default:
            throw new Error('Failed to update project');
        }
      }
      throw error;
    }
};
  
const renameProject = async (projectId, newName) => {
    try {
      const response = await api.post(`/project/${projectId}/rename`, { name: newName });
      return response.data;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 400:
            throw new Error(error.response.data.error || 'Validation error');
          case 404:
            throw new Error('Project not found');
          case 403:
            throw new Error('Access denied');
          default:
            throw new Error('Failed to rename project');
        }
      }
      throw error;
    }
};
  
const deleteProject = async (projectId) => {
    try {
      await api.post(`/project/${projectId}/delete`);
      return true;
    } catch (error) {
      if (error.response) {
        switch (error.response.status) {
          case 404:
            throw new Error('Project not found');
          case 403:
            throw new Error('Access denied');
          default:
            throw new Error('Failed to delete project');
        }
      }
      throw error;
    }
};
  
const selectProject = async (projectId) => {
    try {
      const response = await api.get(`/project/${projectId}`);
      return response;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return {
          data: {
            success: false,
            error: 'Project not found'
          }
        };
      }
      throw error;
    }
};

const shareProject = async (projectId, accessType = 'reader', expiry = null) => {
  // Only allow valid access types
  const validAccessTypes = ['reader', 'co_owner'];
  if (!validAccessTypes.includes(accessType)) {
    throw new Error(`Invalid access type: ${accessType}`);
  }
  
  const data = {
    access_type: accessType
  };
  
  if (expiry) {
    data.expiry_hours = parseInt(expiry);
  }
  
  try {
    const response = await api.post(`/projects/${projectId}/share`, data);
    
    // Return the response data directly
    if (response.data) {
      return response.data;
    }
    
    throw new Error('Failed to share project');
  } catch (error) {
    console.error('Share request failed:', error);
    throw error;
  }
};

const extendProjectShare = async (projectId, extensionHours, accessType) => {
  try {
    const formData = new FormData();
    formData.append('extension_hours', extensionHours);
    if (accessType) {
      formData.append('access_type', accessType);
    }
    
    const response = await api.post(`/projects/${projectId}/share/extend`, formData);
    return response;
  } catch (error) {
    console.error(`Error extending share for project ${projectId}:`, error);
    throw error;
  }
};

const revokeProjectShare = async (projectId, revokeAccess = false, accessType = null, linkId = null) => {
  const formData = new FormData();
  formData.append('revoke_access', revokeAccess ? 'true' : 'false');
  
  if (accessType) {
    // Validate access type if provided
    const validAccessTypes = ['reader', 'co_owner'];
    if (!validAccessTypes.includes(accessType)) {
      throw new Error(`Invalid access type: ${accessType}`);
    }
    formData.append('access_type', accessType);
  }
  
  // Add link ID if provided
  if (linkId) {
    formData.append('share_link_id', linkId);
  }
  
  // Use the correct path - try both with and without /api prefix
  let url = `/projects/${projectId}/share/revoke`;
  
  try {
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response;
  } catch (error) {
    // If first attempt fails, try with /api prefix
    url = `/api/projects/${projectId}/share/revoke`;
    
    const response = await api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response;
  }
};

const getProjectSharingInfo = async (projectId) => {
  try {
    // Try without /api prefix first
    let url = `/projects/${projectId}/share`;
    
    try {
      const response = await api.get(url);
      return response;
    } catch (error) {
      // If first attempt fails, try with /api prefix
      url = `/api/projects/${projectId}/share`;
      
      const response = await api.get(url);
      return response;
    }
  } catch (error) {
    console.error(`Error getting sharing info for project ${projectId}:`, error);
    throw error;
  }
};

const createShareLinks = async (projectId, expiry = null) => {
  try {
    // Convert expiry to string if it exists
    const expiryString = expiry !== null ? String(expiry) : null;
    
    // Make two separate API calls for reader and co_owner links
    const readerPromise = shareProject(projectId, 'reader', expiryString);
    const coOwnerPromise = shareProject(projectId, 'co_owner', expiryString);
    
    const [readerResponse, coOwnerResponse] = await Promise.all([readerPromise, coOwnerPromise]);
    
    // Extract URLs from responses
    const readerUrl = readerResponse?.data?.share_url;
    const coOwnerUrl = coOwnerResponse?.data?.share_url;
    
    return {
      success: !!readerUrl && !!coOwnerUrl,
      shareUrls: {
        reader: readerUrl || '',
        co_owner: coOwnerUrl || ''
      }
    };
  } catch (error) {
    console.error('Error creating share links:', error);
    throw error;
  }
};

const updateProjectStatus = async (projectId, newStatus) => {
  try {
    const response = await api.put(`/project/${projectId}/status`, {
      status: newStatus
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 400:
          throw new Error(error.response.data.error || 'Validation error');
        case 404:
          throw new Error('Project not found');
        case 403:
          throw new Error('Access denied');
        default:
          throw new Error('Failed to update project status');
      }
    }
    throw error;
  }
};

const leaveProject = async (projectId) => {
  try {
    await api.post(`/project/${projectId}/leave`);
    return true;
  } catch (error) {
    if (error.response) {
      switch (error.response.status) {
        case 404:
          throw new Error('Project not found');
        case 403:
          throw new Error(error.response.data.error || 'Access denied');
        default:
          throw new Error('Failed to leave project');
      }
    }
    throw error;
  }
};

// Export all functions as a service object
const projectService = {
    getProjects,
    getRecentProjects,
    getProject,
    createProject,
    editProject,
    renameProject,
    deleteProject,
    selectProject,
    shareProject,
    extendProjectShare,
    revokeProjectShare,
    getProjectSharingInfo,
    createShareLinks,
    updateProjectStatus,
    leaveProject
};

export default projectService;  
