function useVM<VM, P, T>(
  ViewModel: new (props: P, context?: T) => VM,
  props: P,
  context?: T
) {
  const vm = new ViewModel(props, context)
  return vm
}

export { useVM }
