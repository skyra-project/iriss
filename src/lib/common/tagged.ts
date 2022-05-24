export class Tagged<Value, Tag> {
	public readonly value: Value;
	public readonly tag: Tag;

	public constructor(value: Value, tag: Tag) {
		this.value = value;
		this.tag = tag;
	}
}
