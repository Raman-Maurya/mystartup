import {
  FETCH_CONTESTS_REQUEST,
  FETCH_CONTESTS_SUCCESS,
  FETCH_CONTESTS_FAILURE,
  FETCH_USER_CONTESTS_SUCCESS,
  FETCH_CONTEST_DETAILS_SUCCESS,
  JOIN_CONTEST_SUCCESS,
  REFRESH_CONTESTS_NEEDED,
  ADD_NEW_CONTEST
} from '../actions/contestActions';

const initialState = {
  contests: [],
  userContests: [],
  currentContest: null,
  loading: false,
  error: null,
  refreshNeeded: false
};

const contestReducer = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_CONTESTS_REQUEST:
      return {
        ...state,
        loading: true,
        error: null
      };
        case FETCH_CONTESTS_SUCCESS:
      return {
        ...state,
        contests: action.payload,
        loading: false,
        error: null,
        refreshNeeded: false
      };
      
    case FETCH_USER_CONTESTS_SUCCESS:
      return {
        ...state,
        userContests: action.payload,
        loading: false,
        error: null
      };
      
    case FETCH_CONTEST_DETAILS_SUCCESS:
      return {
        ...state,
        currentContest: action.payload,
        loading: false,
        error: null
      };
      
    case JOIN_CONTEST_SUCCESS:
      return {
        ...state,
        currentContest: action.payload,
        loading: false,
        error: null
      };
        case FETCH_CONTESTS_FAILURE:
      return {
        ...state,
        loading: false,
        error: action.payload
      };
        case REFRESH_CONTESTS_NEEDED:
      return {
        ...state,
        refreshNeeded: true
      };
      
    case ADD_NEW_CONTEST:
      return {
        ...state,
        contests: [action.payload, ...state.contests],
        loading: false,
        error: null,
        refreshNeeded: true
      };
      
    default:
      return state;
  }
};

export default contestReducer;