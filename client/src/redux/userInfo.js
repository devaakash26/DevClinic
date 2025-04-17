import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    user: false
};

const userInfo = createSlice({
    name: "user",
    initialState,
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
        }
    }
});

export const { setUser } = userInfo.actions;

export default userInfo.reducer;
