<Typography component="legend">Custom icon and color</Typography>
<StyledRating
name="customized-color"
defaultValue={2}
getLabelText={(value: number) => `${value} Heart${value !== 1 ? 's' : ''}`}
precision={0.5}
icon={<FavoriteIcon fontSize="inherit" />}
emptyIcon={<FavoriteBorderIcon fontSize="inherit" />}
/>
<Typography component="legend">10 stars</Typography>
<Rating name="customized-10" defaultValue={2} max={10} /><Typography component="legend">Custom icon and color</Typography>
<StyledRating
name="customized-color"
defaultValue={2}
getLabelText={(value: number) => `${value} Heart${value !== 1 ? 's' : ''}`}
precision={0.5}
icon={<FavoriteIcon fontSize="inherit" />}
emptyIcon={<FavoriteBorderIcon fontSize="inherit" />}
/>
<Typography component="legend">10 stars</Typography>
<Rating name="customized-10" defaultValue={2} max={10} />