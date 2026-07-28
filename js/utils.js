export function sanitizeHTML(str){

    if(typeof str !== "string"){
        return "";
    }

    return str
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#x27;");
}



export function isValidEmail(email){

    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    .test(email.trim());

}



export function isValidLinkedIn(url){

    return /^https?:\/\/(www\.)?linkedin\.com\/(in|pub|company)\/[^\s/]+\/?$/i
    .test(url.trim());

}



export function showError(slide,message){

    const error =
    document.querySelector(`#error-slide-${slide}`);

    if(!error)return;


    error.querySelector("span").textContent = message;

    error.classList.add("visible");


    setTimeout(()=>{
        error.classList.remove("visible");
    },5000);

}