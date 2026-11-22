/** Style routing for new, ordinary-repeat and hand-edited image requests.
 * Snapshot settings (sampler/model/steps) are independent of style selection.
 * This module deliberately performs no storage, network, DOM or timer work.
 */
export const NO_IMAGE_STYLE=Object.freeze({id:'',name:'Без стиля',value:''});

export function resolveImageStyle({activeStyle=null,snapshotStyle=null,useActiveStyle=false,allowArtStyle=true}={}){
    // An ordinary repeat opts into the currently selected global style.
    if(useActiveStyle)return allowArtStyle && activeStyle ? {...activeStyle} : {...NO_IMAGE_STYLE};
    // The image editor explicitly selects the style for this one image.
    // Backward compatibility: any saved snapshot style is authoritative.
    if(snapshotStyle)return {...snapshotStyle};
    return allowArtStyle && activeStyle ? {...activeStyle} : {...NO_IMAGE_STYLE};
}
