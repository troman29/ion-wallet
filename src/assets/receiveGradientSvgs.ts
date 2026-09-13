import type { ApiChain } from '../api/types';

// TODO: use actual svgs
const RECEIVE_GRADIENT_SVGS: Record<ApiChain, string> = {
  ton: '<svg width="832" height="842" viewBox="0 0 832 842" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_6315_56905)"><path d="M0 0H539L492.314 205.299L439.02 417.049L210 473.75L0 533V0Z" fill="#13EBDD"/><path d="M369.348 201.121L393.5 0H832V351L622 398.267L418.083 454.426L340.623 416.368L369.348 201.121Z" fill="#0099EB"/><path d="M392.979 451.587L621.999 394.886L832 342V842H275.5L339.686 632L392.979 451.587Z" fill="#1345EB"/><path d="M210 471.936L413.917 415.777L510.105 453.835L462.652 632.522L407.5 842H0V528L210 471.936Z" fill="#0099EB"/></g><defs><clipPath id="clip0_6315_56905"><rect width="832" height="842" fill="white"/></clipPath></defs></svg>',
  bnb: '<svg width="412" height="422" viewBox="0 0 412 422" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_4936_42945)"><path d="M0 -4.70117H282.314L229.02 207.048L0 263.749V-4.70117Z" fill="#FFE700"/><path d="M159.348 -8.87891H412V188.267L208.083 244.426L130.623 206.368L159.348 -8.87891Z" fill="#424E87"/><path d="M182.98 241.588L412 184.887V422.001H129.687L182.98 241.588Z" fill="#FFB200"/><path d="M0 261.936L203.917 205.777L300.105 243.835L252.652 422.522H0V261.936Z" fill="#424E87"/></g><defs><clipPath id="clip0_4936_42945"><rect width="412" height="422" fill="white"/></clipPath></defs></svg>',
};

export default RECEIVE_GRADIENT_SVGS;
