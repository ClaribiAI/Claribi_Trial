import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import favoritesService from '../../services/favoritesService';

// Async thunks
export const fetchFavoriteGroups = createAsyncThunk(
  'favorites/fetchGroups',
  async () => {
    const response = await favoritesService.getFavoriteGroups();
    return response.data.data || [];
  }
);

export const createFavoriteGroup = createAsyncThunk(
  'favorites/createGroup',
  async (name, { rejectWithValue }) => {
    try {
      const response = await favoritesService.createFavoriteGroup(name);
      if (!response.data.success) {
        return rejectWithValue(response.data.error);
      }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 
        'A group with this name already exists'
      );
    }
  }
);

export const updateFavoriteGroup = createAsyncThunk(
  'favorites/updateGroup',
  async ({ groupId, name }, { rejectWithValue }) => {
    try {
      const response = await favoritesService.updateFavoriteGroup(groupId, name);
      if (!response.data.success) {
        return rejectWithValue(response.data.error || 'Failed to update group name');
      }
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to update group name');
    }
  }
);

export const deleteFavoriteGroup = createAsyncThunk(
  'favorites/deleteGroup',
  async (groupId) => {
    await favoritesService.deleteFavoriteGroup(groupId);
    return groupId;
  }
);

export const fetchGroupUrls = createAsyncThunk(
  'favorites/fetchGroupUrls',
  async (groupId, { rejectWithValue }) => {
    try {
      const response = await favoritesService.getGroupUrls(groupId);
      if (!response.data.success) {
        return rejectWithValue(response.data.error);
      }
      return { groupId, urls: response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 
        'Failed to fetch favorite URLs'
      );
    }
  }
);

export const addUrlToGroup = createAsyncThunk(
  'favorites/addUrl',
  async ({ groupId, url, title, filters }, { rejectWithValue }) => {
    try {
      const response = await favoritesService.addUrlToGroup(groupId, url, title, filters);
      if (!response.data.success) {
        return rejectWithValue(response.data.error);
      }
      return { groupId, url: response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 
        'This URL is already saved in this favorites group'
      );
    }
  }
);

export const deleteUrl = createAsyncThunk(
  'favorites/deleteUrl',
  async ({ groupId, urlId }, { rejectWithValue }) => {
    try {
      const response = await favoritesService.deleteUrl(groupId, urlId);
      if (!response.data.success) {
        return rejectWithValue(response.data.error);
      }
      return { groupId, urlId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || 
        'Failed to delete favorite URL'
      );
    }
  }
);

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: {
    groups: [],
    selectedGroup: null,
    urls: {},
    loading: false,
    error: null,
    updateLoading: false,
    updateError: null
  },
  reducers: {
    setSelectedGroup: (state, action) => {
      state.selectedGroup = action.payload;
    },
    clearUpdateError: (state) => {
      state.updateError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch groups
      .addCase(fetchFavoriteGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFavoriteGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.groups = action.payload;
      })
      .addCase(fetchFavoriteGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create group
      .addCase(createFavoriteGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createFavoriteGroup.fulfilled, (state, action) => {
        state.loading = false;
        state.groups.push(action.payload);
      })
      .addCase(createFavoriteGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Update group
      .addCase(updateFavoriteGroup.pending, (state) => {
        state.updateLoading = true;
        state.updateError = null;
      })
      .addCase(updateFavoriteGroup.fulfilled, (state, action) => {
        state.updateLoading = false;
        const index = state.groups.findIndex(g => g.id === action.payload.id);
        if (index !== -1) {
          state.groups[index] = action.payload;
        }
      })
      .addCase(updateFavoriteGroup.rejected, (state, action) => {
        state.updateLoading = false;
        state.updateError = action.payload;
      })
      // Delete group
      .addCase(deleteFavoriteGroup.fulfilled, (state, action) => {
        state.groups = state.groups.filter(g => g.id !== action.payload);
        delete state.urls[action.payload];
        if (state.selectedGroup === action.payload) {
          state.selectedGroup = null;
        }
      })
      // Fetch group URLs
      .addCase(fetchGroupUrls.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroupUrls.fulfilled, (state, action) => {
        state.loading = false;
        state.urls[action.payload.groupId] = action.payload.urls;
      })
      .addCase(fetchGroupUrls.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Add URL
      .addCase(addUrlToGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addUrlToGroup.fulfilled, (state, action) => {
        state.loading = false;
        if (state.urls[action.payload.groupId]) {
          state.urls[action.payload.groupId].push(action.payload.url);
        } else {
          state.urls[action.payload.groupId] = [action.payload.url];
        }
      })
      .addCase(addUrlToGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete URL
      .addCase(deleteUrl.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUrl.fulfilled, (state, action) => {
        state.loading = false;
        if (state.urls[action.payload.groupId]) {
          state.urls[action.payload.groupId] = state.urls[action.payload.groupId]
            .filter(url => url.id !== action.payload.urlId);
        }
      })
      .addCase(deleteUrl.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setSelectedGroup, clearUpdateError } = favoritesSlice.actions;
export default favoritesSlice.reducer; 