export default function ConfirmPopup({ action, setAction }) {
    return (
        <div className="fixed top-0 right-0 z-100 w-screen h-screen bg-black/30 backdrop-blur-md flex justify-center items-center font-[Zen_Dots]">
            <content className="bg-white/10 text-white text-center flex flex-wrap justify-around rounded-3xl border-2 border-gray-500">
                <p className="flex-1/1 p-10">Do you want to do {action} ?</p>
                <button className="bg-amber-300 text-black p-2 mb-5 w-25 rounded-2xl" onClick={()=> setAction("")}>Confirm</button>
                <button className="bg-gray-700 p-2 mb-5 w-25 rounded-2xl" onClick={() => setAction("")}>Cancel</button>
            </content>
        </div>
    )
}
