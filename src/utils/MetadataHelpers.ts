import { ValidationOptions } from "@hapi/joi";
import "reflect-metadata";
import { ClassDescription, MetadataKeys } from "..";
import { SchemaArgs } from "../decorators/BaseDecorators";

/**
 * Print class saved metadata
 * @param obj Class
 */
export function printMetadata(obj: any) {
    const metadata = getMetadata(obj);
    console.dir(metadata, {depth: null});
}

/**
 * Extracts metadata for a particular object, aware if that object extends another objects,
 * an joins the metadata properties accordingly ,
 * Method checks recursively through the same object to find super-class metadata
 * @param obj Object class to extract metadata for
 * @param treeMetadata  Metadata registered with Reflect
 */
function getMetadataFromObject(obj: any, treeMetadata: { [name: string]: ClassDescription }) {
    /**
     * Current class name
     */
    const name = obj.name;
    /**
     * Get prototype an prototype name of the class
     * to check if it extends from another class
     */
    const proto = Object.getPrototypeOf(obj);
    const protoName = proto.name;
    /**
     * Current class metadata
     * WIll override if necessary the super class metadata
     */
    const existingObject = treeMetadata[name] || {};
    if (!!protoName && protoName !== "Object") {
        const existingFields = existingObject.fields || {};
        let superMetadata = getMetadataFromObject(proto, treeMetadata);
        superMetadata = { ...superMetadata };

      Object.keys(existingFields).forEach((x) => {
        if (!superMetadata[x]) {
                /**
                 * If a property exist on the current class but not on the super class
                 * insert the property
                 */
                superMetadata[x] = existingFields[x];
            } else {
                /**
                 * Override the super class metadata for that field with the latest class field metadata
                 */
                superMetadata[x] = { ...superMetadata[x], ...existingFields[x] };
            }
        });
        return superMetadata;
    } else {
        return existingObject.fields || {};
    }

}

/**
 * Return type metadata
 * TODO: Get metadata without needing to instantiate the object
 * @param obj
 */
export function getMetadata(obj: any) {
    const tp = new obj();
    /**
     * Gets the metadata for the current class,
     * Returns a key value object with all base classes and inheriting classes
     */
    const retVal = Reflect.getMetadata(MetadataKeys.Fields, tp);
    if (!retVal) {
        return;
    }
  return getMetadataFromObject(obj, retVal);
}

export function getOptions(obj: any): ValidationOptions {
    const tp = new obj();
    const retVal = Reflect.getMetadata(MetadataKeys.Fields, tp);
    if (!retVal) {
        return;
    }
    if (!obj.name) {
        return;
    }
    const selected = retVal[obj.name];
    return selected.options;
}

export function getGlobalArgs(obj: any): SchemaArgs{
    const tp = new obj();
    const retVal = Reflect.getMetadata(MetadataKeys.Fields, tp);
    if (!retVal) {
        return;
    }
    if (!obj.name) {
        return;
    }
    const selected = retVal[obj.name];
    return selected.globalArgs;
}
