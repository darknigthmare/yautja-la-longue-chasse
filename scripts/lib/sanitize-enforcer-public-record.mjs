import path from 'node:path';

/** Keep a reviewable public record without local paths or private transfer metadata. */
export function sanitizeEnforcerPublicRecord(value){
 if(Array.isArray(value))return value.map(sanitizeEnforcerPublicRecord);
 if(value&&typeof value==='object'){
  const result={};
  for(const [key,entry] of Object.entries(value)){
   if(key==='localPath'||/drive.*(?:id|url)|(?:download|upload|signed)_?url|file_?uri|access_?token|authorization/i.test(key))continue;
   if(['nativeSourcePath','nativePath','inputNativeSourcePath','selectedNativeSourcePath'].includes(key)){
    result[key.replace(/Path$/,'Name')]=typeof entry==='string'?path.basename(entry):entry;continue;
   }
   if(key==='inputReferencedImagePaths'){
    result.inputReferenceNames=entry.map(p=>path.basename(p));continue;
   }
   result[key]=sanitizeEnforcerPublicRecord(entry);
  }
  return result;
 }
 if(typeof value==='string'){
  if(/^\/(?:workspace|root|tmp|mnt)\//.test(value))return path.basename(value);
  if(/(?:authfile:|file:\/\/|[?&](?:token|signature|x-goog-signature|x-amz-signature)=)/i.test(value))return '[référence de transfert omise]';
  return value.replace(/\/(?:workspace|root|tmp|mnt)\/[^\s"'<>]+/g,'[chemin local omis]');
 }
 return value;
}
